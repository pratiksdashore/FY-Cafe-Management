import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { smsService } from '@/services/sms';
import { MessageSquare, TestTube, CheckCircle, AlertCircle, Heart } from 'lucide-react';

const SMSTestPage = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isTestLoading, setIsTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [isHealthLoading, setIsHealthLoading] = useState(false);
  const [healthStatus, setHealthStatus] = useState<'healthy' | 'unhealthy' | null>(null);

  const handleTestSMS = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      toast({
        title: 'Invalid Phone Number',
        description: 'Please enter a valid 10-digit phone number',
        variant: 'destructive',
      });
      return;
    }

    setIsTestLoading(true);
    setTestResult(null);

    try {
      const success = await smsService.testSMS(phoneNumber);
      
      if (success) {
        setTestResult('success');
        toast({
          title: 'SMS Sent Successfully! 🎉',
          description: `Test SMS sent to ${phoneNumber}`,
        });
      } else {
        setTestResult('error');
        toast({
          title: 'SMS Failed',
          description: 'Failed to send test SMS. Check console for details.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      setTestResult('error');
      toast({
        title: 'SMS Test Error',
        description: error.message || 'An error occurred while sending SMS',
        variant: 'destructive',
      });
    } finally {
      setIsTestLoading(false);
    }
  };

  const handleHealthCheck = async () => {
    setIsHealthLoading(true);
    setHealthStatus(null);

    try {
      const isHealthy = await smsService.checkHealth();
      
      if (isHealthy) {
        setHealthStatus('healthy');
        toast({
          title: 'SMS Service Healthy ✅',
          description: 'The SMS service is running and Twilio is configured',
        });
      } else {
        setHealthStatus('unhealthy');
        toast({
          title: 'SMS Service Unhealthy ❌',
          description: 'Check that the SMS service is running and Twilio is configured',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      setHealthStatus('unhealthy');
      toast({
        title: 'Health Check Failed',
        description: error.message || 'Failed to check SMS service health',
        variant: 'destructive',
      });
    } finally {
      setIsHealthLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <MessageSquare className="w-8 h-8 text-primary" />
          <div>
            <h1 className="font-display font-bold text-3xl">SMS Notification Test</h1>
            <p className="text-muted-foreground">Test Twilio SMS functionality for order notifications</p>
          </div>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5" />
              Service Health Check
            </CardTitle>
            <CardDescription>
              Check if the SMS service is running and Twilio is properly configured.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleHealthCheck}
              disabled={isHealthLoading}
              variant="outline"
              className="w-full"
            >
              {isHealthLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
                  Checking Service Health...
                </>
              ) : (
                <>
                  <Heart className="w-4 h-4 mr-2" />
                  Check SMS Service Health
                </>
              )}
            </Button>

            {healthStatus && (
              <div className={`p-4 rounded-lg flex items-center gap-3 ${
                healthStatus === 'healthy' 
                  ? 'bg-green-50 text-green-700 border border-green-200' 
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {healthStatus === 'healthy' ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
                <div>
                  <p className="font-medium">
                    {healthStatus === 'healthy' ? 'SMS Service Healthy' : 'SMS Service Unhealthy'}
                  </p>
                  <p className="text-sm opacity-90">
                    {healthStatus === 'healthy' 
                      ? 'The SMS service is running and Twilio is configured correctly'
                      : 'Check that the SMS service is running and Twilio credentials are set'
                    }
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="w-5 h-5" />
              Send Test SMS
            </CardTitle>
            <CardDescription>
              Send a test SMS to verify that your Twilio configuration is working correctly.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="test-phone">Phone Number</Label>
              <Input
                id="test-phone"
                type="tel"
                placeholder="Enter 10-digit mobile number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                maxLength={10}
              />
              <p className="text-xs text-muted-foreground">
                Enter the phone number where you want to receive the test SMS
              </p>
            </div>

            <Button
              onClick={handleTestSMS}
              disabled={isTestLoading || !phoneNumber || phoneNumber.length < 10}
              className="w-full"
            >
              {isTestLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Sending Test SMS...
                </>
              ) : (
                <>
                  <TestTube className="w-4 h-4 mr-2" />
                  Send Test SMS
                </>
              )}
            </Button>

            {testResult && (
              <div className={`p-4 rounded-lg flex items-center gap-3 ${
                testResult === 'success' 
                  ? 'bg-green-50 text-green-700 border border-green-200' 
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {testResult === 'success' ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
                <div>
                  <p className="font-medium">
                    {testResult === 'success' ? 'SMS Sent Successfully' : 'SMS Failed'}
                  </p>
                  <p className="text-sm opacity-90">
                    {testResult === 'success' 
                      ? `Test SMS was sent to ${phoneNumber}`
                      : 'Check your Twilio configuration and console for errors'
                    }
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>SMS Features</CardTitle>
            <CardDescription>
              This system sends SMS notifications for the following events:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-sm">1</span>
                </div>
                <div>
                  <h4 className="font-medium">Order Confirmation</h4>
                  <p className="text-sm text-muted-foreground">
                    Sent immediately after successful order placement with token number, wait time, and total amount
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-sm">2</span>
                </div>
                <div>
                  <h4 className="font-medium">Order Ready</h4>
                  <p className="text-sm text-muted-foreground">
                    Sent when the order status changes to "READY" for pickup notification
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SMSTestPage;
