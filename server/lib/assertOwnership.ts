export function assertOwnership(resource: { userId: string }, userId: string, role?: string) {
  if (resource.userId !== userId && role !== 'ADMIN') {
    throw new Error('Forbidden')
  }
}
