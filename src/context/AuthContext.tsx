import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { authService } from '@/services/supabase';
import { toast } from '@/hooks/use-toast';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    signUp: (email: string, password: string, fullName: string) => Promise<void>;
    signIn: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    // Initialize auth state
    useEffect(() => {
        const initAuth = async () => {
            try {
                const session = await authService.getSession();
                setSession(session);
                setUser(session?.user ?? null);
            } catch (error) {
                console.error('Error initializing auth:', error);
            } finally {
                setLoading(false);
            }
        };

        initAuth();

        // Listen for auth changes
        const { data: { subscription } } = authService.onAuthStateChange((event, session) => {
            console.log('Auth state changed:', event);
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const signUp = useCallback(async (email: string, password: string, fullName: string) => {
        try {
            setLoading(true);
            const { user, session } = await authService.signUpWithEmail(email, password, fullName);

            setUser(user);
            setSession(session);

            toast({
                title: '✅ Account Created',
                description: 'Welcome to Smart Order Hub! Please check your email to verify your account.',
            });
        } catch (error: any) {
            console.error('Sign up error:', error);
            toast({
                title: 'Sign Up Failed',
                description: error.message || 'Failed to create account. Please try again.',
                variant: 'destructive',
            });
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    const signIn = useCallback(async (email: string, password: string) => {
        try {
            setLoading(true);
            const { user, session } = await authService.signInWithEmail(email, password);

            setUser(user);
            setSession(session);

            toast({
                title: '✅ Welcome Back',
                description: 'You have successfully signed in.',
            });
        } catch (error: any) {
            console.error('Sign in error:', error);
            toast({
                title: 'Sign In Failed',
                description: error.message || 'Invalid email or password.',
                variant: 'destructive',
            });
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    const signOut = useCallback(async () => {
        try {
            setLoading(true);
            await authService.signOut();

            setUser(null);
            setSession(null);

            toast({
                title: 'Signed Out',
                description: 'You have been successfully signed out.',
            });
        } catch (error: any) {
            console.error('Sign out error:', error);
            toast({
                title: 'Sign Out Failed',
                description: error.message || 'Failed to sign out. Please try again.',
                variant: 'destructive',
            });
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    const value = {
        user,
        session,
        loading,
        signUp,
        signIn,
        signOut,
        isAuthenticated: !!user,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
