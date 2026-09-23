import { Navigate, Outlet } from "react-router-dom";

/*
 * Gate for routes that require a logged-in user. Used as a parent
 * route in App.tsx: any route nested inside it only renders if a
 * token is present, otherwise the visitor is bounced to /login.
 *
 * Note: this only checks that a token *exists* in localStorage, not
 * that it's still valid/unexpired - the server will reject an
 * expired token on the actual API/WebSocket calls regardless.
 */
export function ProtectedRoute() {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
