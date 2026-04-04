import "express-session";

declare module "express-session" {
  interface SessionData {
    userId: string;
    username: string;
    role: string;
  }
}

export interface AuthenticatedRequest {
  session: {
    userId: string;
    username: string;
    role: string;
    destroy: (cb: (err?: any) => void) => void;
    save: (cb?: (err?: any) => void) => void;
  } & Record<string, any>;
}
