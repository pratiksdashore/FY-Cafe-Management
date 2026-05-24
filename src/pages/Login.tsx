import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Loader2, User, Shield, Phone, Lock } from 'lucide-react';
import { api } from '@/services/api';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type UserRole = 'CUSTOMER' | 'ADMIN' | 'VENDOR';

const Login = () => {
    const navigate = useNavigate();
    const [role, setRole] = useState<UserRole>('CUSTOMER');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otp, setOtp] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [timer, setTimer] = useState(0);

    // Start countdown timer
    const startTimer = () => {
        setTimer(60);
        const interval = setInterval(() => {
            setTimer((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const handleSendOTP = async (e: React.FormEvent) => {
        e.preventDefault();

        if (phoneNumber.length !== 10) {
            toast({
                title: 'Invalid phone number',
                description: 'Please enter a valid 10-digit phone number',
                variant: 'destructive',
            });
            return;
        }

        try {
            setLoading(true);
            await api.sendOTP(phoneNumber);

            setOtpSent(true);
            startTimer();

            toast({
                title: '✅ OTP Sent',
                description: `Verification code sent to ${phoneNumber}`,
            });
        } catch (err: any) {
            toast({
                title: 'Failed to send OTP',
                description: err.response?.data?.error || 'Please try again',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async (e: React.FormEvent) => {
        e.preventDefault();

        if (otp.length !== 6) {
            toast({
                title: 'Invalid OTP',
                description: 'Please enter the 6-digit code',
                variant: 'destructive',
            });
            return;
        }

        try {
            setLoading(true);
            const response = await api.verifyOTP(phoneNumber, otp, role);

            // Store token and user info
            localStorage.setItem('token', response.data.data.access_token);
            localStorage.setItem('user', JSON.stringify(response.data.data.user));

            toast({
                title: '✅ Login Successful',
                description: `Welcome ${response.data.data.user.full_name || 'back'}!`,
            });

            // Redirect based on role
            if (role === 'ADMIN' || role === 'VENDOR') {
                navigate('/admin');
            } else {
                navigate('/');
            }
        } catch (err: any) {
            toast({
                title: 'Verification failed',
                description: err.response?.data?.error || 'Invalid OTP',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleResendOTP = async () => {
        if (timer > 0) return;

        try {
            setLoading(true);
            await api.sendOTP(phoneNumber);
            startTimer();

            toast({
                title: '✅ OTP Resent',
                description: 'New verification code sent',
            });
        } catch (err: any) {
            toast({
                title: 'Failed to resend OTP',
                description: err.response?.data?.error || 'Please try again',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-golden-amber/5 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo/Header */}
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <span className="text-4xl">🍽️</span>
                    </div>
                    <h1 className="font-display font-bold text-3xl mb-2">Smart Order Hub</h1>
                    <p className="text-muted-foreground">Pre-order your meals, skip the wait</p>
                </div>

                {/* Login Card */}
                <div className="bg-card rounded-2xl shadow-xl border p-8">
                    {/* Role Selection */}
                    {!otpSent && (
                        <div className="mb-6">
                            <label className="block text-sm font-medium mb-3">Login as</label>
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setRole('CUSTOMER')}
                                    className={cn(
                                        'p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2',
                                        role === 'CUSTOMER'
                                            ? 'border-primary bg-primary/10 text-primary'
                                            : 'border-border hover:border-primary/30'
                                    )}
                                >
                                    <User className="w-5 h-5" />
                                    <span className="text-xs font-medium">Customer</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setRole('VENDOR')}
                                    className={cn(
                                        'p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2',
                                        role === 'VENDOR'
                                            ? 'border-primary bg-primary/10 text-primary'
                                            : 'border-border hover:border-primary/30'
                                    )}
                                >
                                    <User className="w-5 h-5" />
                                    <span className="text-xs font-medium">Vendor</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setRole('ADMIN')}
                                    className={cn(
                                        'p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2',
                                        role === 'ADMIN'
                                            ? 'border-primary bg-primary/10 text-primary'
                                            : 'border-border hover:border-primary/30'
                                    )}
                                >
                                    <Shield className="w-5 h-5" />
                                    <span className="text-xs font-medium">Admin</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Phone Number Input */}
                    {!otpSent ? (
                        <form onSubmit={handleSendOTP} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    Phone Number
                                </label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                    <input
                                        type="tel"
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                        placeholder="Enter 10-digit mobile number"
                                        className="w-full pl-11 pr-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        maxLength={10}
                                        required
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    We'll send you a verification code
                                </p>
                            </div>

                            <Button
                                type="submit"
                                className="w-full"
                                disabled={loading || phoneNumber.length !== 10}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Sending OTP...
                                    </>
                                ) : (
                                    'Send OTP'
                                )}
                            </Button>
                        </form>
                    ) : (
                        // OTP Verification
                        <form onSubmit={handleVerifyOTP} className="space-y-4">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-sm font-medium">
                                        Verification Code
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setOtpSent(false);
                                            setOtp('');
                                            setTimer(0);
                                        }}
                                        className="text-xs text-primary hover:underline"
                                    >
                                        Change Number
                                    </button>
                                </div>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                    <input
                                        type="text"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        placeholder="Enter 6-digit OTP"
                                        className="w-full pl-11 pr-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-center text-2xl tracking-widest font-semibold"
                                        maxLength={6}
                                        required
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Code sent to {phoneNumber}
                                </p>
                            </div>

                            <Button
                                type="submit"
                                className="w-full"
                                disabled={loading || otp.length !== 6}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Verifying...
                                    </>
                                ) : (
                                    'Verify & Login'
                                )}
                            </Button>

                            {/* Resend OTP */}
                            <div className="text-center">
                                {timer > 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        Resend code in <span className="font-semibold text-primary">{timer}s</span>
                                    </p>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleResendOTP}
                                        className="text-sm text-primary hover:underline font-medium"
                                        disabled={loading}
                                    >
                                        Resend OTP
                                    </button>
                                )}
                            </div>
                        </form>
                    )}
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-muted-foreground mt-6">
                    By continuing, you agree to our Terms of Service and Privacy Policy
                </p>
            </div>
        </div>
    );
};

export default Login;
