# Internal PaaS

A self-hosted Platform-as-a-Service that deploys applications from Git repositories onto a Kubernetes cluster through a GitOps pipeline, without requiring end users to author Kubernetes manifests or maintain CI/CD configuration by hand.

## Overview

Internal PaaS provides a Heroku-style developer experience — connect a repository, configure environment variables, deploy — while the underlying infrastructure is a Kubernetes cluster managed declaratively through Git. The system is composed of a web control plane (this repository) and a Kubernetes-native reconciliation layer: a custom Kubernetes controller and ArgoCD, both external to this repository, which the control plane integrates with rather than replaces.

The project was built to explore how far a conventional Node.js application can be pushed as the control plane for infrastructure that is normally driven by cluster-native tooling, and to work through the constraints that model imposes: no privileged access to the underlying nodes, no direct cluster-mutation permissions beyond a narrow RBAC surface, and a reconciliation loop (ArgoCD) that runs on its own schedule rather than on request.

## Architecture

```
 ┌──────────┐   commit    ┌─────────────┐   push    ┌────────────────┐
 │  Web UI  │────────────▶│  build.worker │─────────▶│  BuildKit (mTLS) │
 │ (React)  │             │  (BullMQ)     │  image    │  in-cluster       │
 └──────────┘             └──────┬────────┘           └────────┬─────────┘
       ▲                          │                             │ push
       │ socket.io                │ enqueue                     ▼
       │ (live logs)               ▼                     container registry
       │                    ┌──────────────┐
       │                    │ gitops.worker │
       │                    │  (BullMQ)     │
       │                    └──────┬────────┘
       │                           │ commit + push manifest
       │                           ▼
       │                  GitOps manifest repository
       │                           │
       │                           ▼ (poll interval)
       │                    ArgoCD ApplicationSet
       │                           │ sync
       │                           ▼
       │              Application / Database Custom Resource
       │                           │ reconcile
       │                           ▼
       └──────────────── Kubernetes Deployment, Service, Ingress, Secret
                          (managed by an external Go controller)
```

A deployment request passes through two independent, queue-backed workers rather than a single synchronous pipeline:

1. **`build.worker`** clones the target repository, detects its runtime (React/Vite or Express, with sub-strategies for compiled, `ts-node`, or plain Node execution), generates a Dockerfile when the repository does not already provide one, and builds and pushes the resulting image.
2. **`gitops.worker`** writes the corresponding `Application` or `Database` manifest to a separate Git repository, updates the target Kubernetes `Secret` holding the application's environment variables directly through the Kubernetes API, and polls for the downstream reconciliation to complete, since that reconciliation runs on ArgoCD's own interval and is outside this system's control.

Both workers log into the same identifier, so a single deployment's output — spanning two separate background jobs — is streamed to the frontend as one continuous log over a Socket.IO channel, backed by an in-memory backlog buffer for clients that join mid-stream.

## Key Engineering Decisions

**Image builds via BuildKit rather than a Docker daemon.** The control plane runs as a pod inside the cluster it manages, and has no Docker socket to talk to. Mounting the host's Docker socket into the pod was considered and rejected, since it grants root-equivalent access to the entire node. Image builds instead run against a dedicated `buildkitd` deployment inside the cluster, reached over mutual TLS, communicated with through `buildctl` — there is no maintained Node.js client for BuildKit's gRPC API, so the control plane shells out to the CLI BuildKit itself ships, the same approach `docker buildx` uses internally.

**GitOps rather than direct cluster mutation.** The control plane never calls the Kubernetes API to create application workloads. It writes declarative manifests to Git; ArgoCD detects and applies them; a separate Kubernetes controller reconciles the platform's custom resources into standard objects. This keeps the control plane's own permissions minimal — Git write access and a narrow Secret read/write scope — at the cost of the platform having to account for reconciliation latency it cannot directly observe or shorten.

**Application-layer authorization for credential access.** Kubernetes RBAC alone does not adequately scope access to database credentials: a service account with permission to read Secrets in a namespace can read all of them, not only those belonging to the requesting user. The actual authorization boundary for the credential-viewing feature is therefore enforced in the application layer — an ownership check runs before any Kubernetes API call is made — and RBAC is treated as a coarse backstop rather than the primary control.

**Non-root container images.** Generated Dockerfiles run application processes as an unprivileged user rather than root. This has a direct consequence for port selection: ports below 1024 require elevated privileges to bind, so generated images default to unprivileged ports and the platform's internal port resolution accounts for this rather than assuming a fixed port per framework.

**Build-time versus runtime configuration.** Static frontend builds (Vite) inline environment variables into the compiled JavaScript at build time; a container's runtime environment variables are invisible to code that no longer exists as a running process by the time the container starts. The build pipeline distinguishes between variables that must be supplied as Docker build arguments (anything intended for a client bundle) and variables that are only ever needed at runtime, and threads the former through the image build step accordingly.

## Technology Stack

**Frontend** — React 18, TypeScript, Vite, Tailwind CSS, TanStack Query, Zustand, React Router, Axios, Socket.IO client.

**Backend** — Node.js, TypeScript, Express, Prisma ORM, PostgreSQL, Redis, BullMQ, Socket.IO, `simple-git`, `@kubernetes/client-node`, Zod.

**Infrastructure** — Docker, BuildKit, Kubernetes, ArgoCD, a custom Kubernetes controller (external to this repository), GitHub Container Registry.

## Core Capabilities

- Git-connected application deployment with automatic runtime detection and Dockerfile generation.
- Queue-backed build and deployment pipeline with live, streamed build and provisioning logs.
- Managed database provisioning (PostgreSQL, Redis) with credential access gated by application-layer ownership checks and a reveal-on-demand interface.
- Environment variable management per application, including correct handling of build-time-only configuration for static frontends.
- JWT-based authentication with access and refresh tokens, and role-based authorization.
- Deployment history with per-deployment status and logs.

## Project Structure

```
Internal-PaaS/
├── client/                  React frontend
│   └── src/
│       ├── api/              API client and service definitions
│       ├── components/       Shared UI components
│       ├── hooks/             Data-fetching and socket hooks
│       ├── pages/             Route-level views
│       └── stores/            Client-side state (Zustand)
├── server/                  Express backend
│   ├── controllers/           Route handlers
│   ├── services/               Business logic
│   ├── workers/                 BullMQ workers (build, gitops)
│   ├── queues/                   BullMQ queue definitions
│   ├── lib/                       Shared infrastructure (Kubernetes client,
│   │                                BuildKit client, Dockerfile generation,
│   │                                logging)
│   ├── middleware/                 Express middleware
│   ├── prisma/                       Database schema and migrations
│   └── validator/                     Request validation schemas
└── docker-compose.yml         Local PostgreSQL and Redis for development
```

## Local Development

Local development runs the control plane against local PostgreSQL and Redis instances. It does not require a Kubernetes cluster; features that depend on cluster reconciliation (credential provisioning, live application status) require the backend to run inside the target cluster with the appropriate service account.

### Prerequisites

- Node.js 20 or later
- Docker and Docker Compose
- Git

### Setup

```bash
git clone <repository-url>
cd Internal-PaaS

docker-compose up -d

cd server
npm install
cp .env.example .env
npx prisma migrate dev
npm run dev

cd ../client
npm install
cp .env.example .env
npm run dev
```

The frontend is served at `http://localhost:5173`; the backend API and Socket.IO server at `http://localhost:5001`.

## Container Images

Both the frontend and backend ship with production Dockerfiles. The backend image embeds the `buildctl` binary required to communicate with the in-cluster BuildKit deployment. The frontend image is a multi-stage build; API and Socket.IO endpoints must be supplied as build arguments, since they are compiled into the static bundle rather than read at container runtime:

```bash
docker build -t internal-paas-server ./server

docker build \
  --build-arg VITE_API_URL=https://api.example.com/api \
  --build-arg VITE_SOCKET_URL=https://api.example.com \
  -t internal-paas-client ./client
```

## License

MIT
