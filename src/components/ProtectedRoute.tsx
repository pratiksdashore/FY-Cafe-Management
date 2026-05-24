import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredRole?: 'CUSTOMER' | 'ADMIN' | 'VENDOR';
}

export const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
    const location = useLocation();
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    // Check if user is authenticated
    if (!token || !userStr) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Check role if required
    if (requiredRole) {
        try {
            const user = JSON.parse(userStr);

            if (user.role !== requiredRole) {
                // Redirect to appropriate dashboard based on actual role
                if (user.role === 'ADMIN' || user.role === 'VENDOR') {
                    return <Navigate to="/admin" replace />;
                }
                return <Navigate to="/" replace />;
            }
        } catch (err) {
            // Invalid user data, clear and redirect to login
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            return <Navigate to="/login" replace />;
        }
    }

    return <>{children}</>;
};
