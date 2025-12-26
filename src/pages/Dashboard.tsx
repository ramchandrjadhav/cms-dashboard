import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { StatsCard } from '@/components/ui/stats-card';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { NewYearAnimation } from '@/components/animations/NewYearAnimation';

export default function Dashboard() {
  const navigate = useNavigate();
  
  const { data: statsResponse, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => apiClient.getDashboardStats(),
  });

  const stats = statsResponse;

  // 🎄 Snow Animation
  useEffect(() => {
    const container = document.querySelector(".snow-container");
    for (let i = 0; i < 60; i++) {
      const s = document.createElement("div");
      s.className = "snowflake";
      s.style.setProperty("--left", Math.random() * 100 + "vw");
      s.style.setProperty("--duration", 2 + Math.random() * 4 + "s");
      container?.appendChild(s);
      setTimeout(() => s.remove(), 6000);
    }
  }, []);

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="relative">
      <div className="space-y-8">
        <PageHeader
          title=""
          description=""
          actions={
            <Button onClick={() => navigate('/intelligence/coverage')}>
              <TrendingUp className="mr-2 h-4 w-4" />
              View Reports
            </Button>
          }
        />
<br></br>
        <div className="snow-container"></div>
        {/* <h2 className="christmas-text">🎄 Merry Christmas ❄</h2> */}

        {/* New Year Animation - Shows on page load */}
        <NewYearAnimation isActive={true} />
      </div>
    </div>
  );
}
