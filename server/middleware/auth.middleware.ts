import { Request, Response, NextFunction } from 'express'
import { verifyAccessToken } from '../lib/token'

export interface AuthRequest extends Request {
  user?: {
    userId: string
    email: string
    role: string
  }
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, message: 'No token provided' })
      return
    }

    const token = authHeader.split(' ')[1]
    const payload = verifyAccessToken(token)
    req.user = payload
    next()
  } catch (error) {
    res.status(401).json({ success:false,message: "Token unavailable"})
    console.log(error)
    return
  }
}

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: 'Forbidden' })
      return
    }
    next()
  }
}