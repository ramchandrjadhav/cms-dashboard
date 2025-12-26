import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Construction } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function NotImplemented() {
  const navigate = useNavigate();
  const location = useLocation();

  const getPageTitle = () => {
    const path = location.pathname;
    const segments = path.split('/').filter(Boolean);
    return segments.map(segment => 
      segment.charAt(0).toUpperCase() + segment.slice(1).replace('-', ' ')
    ).join(' > ');
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={getPageTitle()}
        description="This page is currently under development"
        actions={
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        }
      />

      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">
              <Construction className="h-8 w-8 text-orange-600" />
            </div>
            <CardTitle>Coming Soon</CardTitle>
            <CardDescription>
              This feature is currently under development and will be available soon.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Current path: <code className="bg-gray-100 px-2 py-1 rounded">{location.pathname}</code>
            </p>
            <Button onClick={() => navigate('/dashboard')}>
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}