import { useEffect, useState } from "react";
import { GoogleMap, Marker, Polyline, useJsApiLoader } from "@react-google-maps/api";
import { Button } from "@/components/ui/button";
import { Loader2, Navigation } from "lucide-react";

interface JobsMapProps {
  jobs: any[];
  selectedJob?: any;
  onJobSelect?: (job: any) => void;
  optimizedRoute?: {
    path: { lat: number; lng: number }[];
    distance: string;
    duration: string;
  };
}

const statusColors: Record<string, string> = {
  lead: "#6b7280",
  service_call: "#3b82f6",
  quoted: "#eab308",
  scheduled: "#a855f7",
  in_progress: "#f97316",
  completed: "#22c55e",
  invoiced: "#06b6d4",
  paid: "#10b981",
  cancelled: "#ef4444"
};

export const JobsMap = ({ jobs, selectedJob, onJobSelect, optimizedRoute }: JobsMapProps) => {
  const [center, setCenter] = useState({ lat: 39.8283, lng: -98.5795 }); // Center of USA
  const [zoom, setZoom] = useState(4);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries: ["places"]
  });

  useEffect(() => {
    if (jobs.length > 0) {
      const validJobs = jobs.filter(j => j.lat && j.lng);
      if (validJobs.length > 0) {
        const avgLat = validJobs.reduce((sum, j) => sum + parseFloat(j.lat), 0) / validJobs.length;
        const avgLng = validJobs.reduce((sum, j) => sum + parseFloat(j.lng), 0) / validJobs.length;
        setCenter({ lat: avgLat, lng: avgLng });
        setZoom(11);
      }
    }
  }, [jobs]);

  if (loadError) {
    return (
      <div className="h-full flex items-center justify-center bg-muted/30 rounded-lg">
        <div className="text-center space-y-2">
          <p className="text-sm text-destructive">Error loading maps</p>
          <p className="text-xs text-muted-foreground">Please check your API key</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="h-full flex items-center justify-center bg-muted/30 rounded-lg">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const mapContainerStyle = {
    width: '100%',
    height: '100%',
    borderRadius: '0.5rem'
  };

  return (
    <div className="relative h-full">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={zoom}
        options={{
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false
        }}
      >
        {jobs.filter(j => j.lat && j.lng).map((job, index) => (
          <Marker
            key={job.id}
            position={{ lat: parseFloat(job.lat), lng: parseFloat(job.lng) }}
            onClick={() => onJobSelect?.(job)}
            label={{
              text: job.route_order ? job.route_order.toString() : (index + 1).toString(),
              color: "white",
              fontWeight: "bold"
            }}
            icon={{
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 12,
              fillColor: statusColors[job.status] || "#6b7280",
              fillOpacity: selectedJob?.id === job.id ? 1 : 0.8,
              strokeColor: "white",
              strokeWeight: 2
            }}
          />
        ))}

        {optimizedRoute && (
          <Polyline
            path={optimizedRoute.path}
            options={{
              strokeColor: "#10b981",
              strokeWeight: 4,
              strokeOpacity: 0.8
            }}
          />
        )}
      </GoogleMap>

      {optimizedRoute && (
        <div className="absolute top-4 right-4 bg-background/95 backdrop-blur-sm border rounded-lg p-3 shadow-lg space-y-1">
          <div className="flex items-center gap-2">
            <Navigation className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Optimized Route</span>
          </div>
          <div className="text-xs text-muted-foreground">
            <p>Distance: {optimizedRoute.distance}</p>
            <p>Duration: {optimizedRoute.duration}</p>
          </div>
        </div>
      )}
    </div>
  );
};
