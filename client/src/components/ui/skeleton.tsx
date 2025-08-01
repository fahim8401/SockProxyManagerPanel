import React from "react";

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  className = "", 
  width = "100%", 
  height = "1rem",
  rounded = false 
}) => {
  return (
    <div 
      className={`skeleton ${rounded ? 'rounded-full' : 'rounded'} ${className}`}
      style={{ width, height }}
    />
  );
};

// Card Skeleton for dashboard cards
export const CardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 animate-fadeInUp">
      <div className="flex items-center justify-between mb-4">
        <Skeleton height="1.5rem" width="60%" />
        <Skeleton height="2rem" width="2rem" rounded />
      </div>
      <div className="space-y-2">
        <Skeleton height="2rem" width="40%" />
        <Skeleton height="1rem" width="80%" />
      </div>
    </div>
  );
};

// Stats Card Skeleton
export const StatsCardSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {[...Array(4)].map((_, i) => (
        <div 
          key={i} 
          className={`bg-white rounded-lg shadow-sm border p-6 animate-fadeInUp delay-${(i + 1) * 100}`}
        >
          <div className="flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <Skeleton height="1rem" width="70%" />
              <Skeleton height="2rem" width="50%" />
              <Skeleton height="0.75rem" width="60%" />
            </div>
            <Skeleton height="3rem" width="3rem" rounded />
          </div>
        </div>
      ))}
    </div>
  );
};

// Table Skeleton
export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border animate-fadeInUp delay-200">
      <div className="p-6 border-b">
        <Skeleton height="1.5rem" width="40%" />
      </div>
      <div className="p-6">
        <div className="space-y-4">
          {/* Table Header */}
          <div className="grid grid-cols-5 gap-4 pb-2 border-b">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} height="1rem" width="80%" />
            ))}
          </div>
          {/* Table Rows */}
          {[...Array(rows)].map((_, i) => (
            <div key={i} className="grid grid-cols-5 gap-4 py-2">
              {[...Array(5)].map((_, j) => (
                <Skeleton key={j} height="1rem" width={`${60 + (j * 10)}%`} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Chart Skeleton
export const ChartSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 animate-fadeInUp delay-300">
      <div className="flex items-center justify-between mb-6">
        <Skeleton height="1.5rem" width="40%" />
        <Skeleton height="1rem" width="20%" />
      </div>
      <div className="h-64 flex items-end justify-between space-x-2">
        {[...Array(12)].map((_, i) => (
          <Skeleton 
            key={i} 
            width="2rem" 
            height={`${Math.random() * 80 + 20}%`}
            className="rounded-t"
          />
        ))}
      </div>
    </div>
  );
};

export default Skeleton;