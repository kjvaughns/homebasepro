import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Clock } from "lucide-react";

const tutorials = [
  {
    id: "1",
    title: "Getting Started with HomeBase",
    description: "Learn the basics of setting up your provider account",
    duration: "2:30",
    category: "Basics",
    thumbnail: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400",
  },
  {
    id: "2",
    title: "Creating Your First Job",
    description: "Step-by-step guide to creating and scheduling jobs",
    duration: "3:15",
    category: "Jobs",
    thumbnail: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=400",
  },
  {
    id: "3",
    title: "Managing Client Relationships",
    description: "Use the CRM to track client history and communications",
    duration: "4:00",
    category: "CRM",
    thumbnail: "https://images.unsplash.com/photo-1581093458791-9f3c3900df4b?w=400",
  },
  {
    id: "4",
    title: "Setting Up Payment Links",
    description: "Create and share payment links with clients",
    duration: "2:45",
    category: "Payments",
    thumbnail: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=400",
  },
  {
    id: "5",
    title: "Understanding Your Analytics",
    description: "Track your business performance with analytics dashboard",
    duration: "3:30",
    category: "Analytics",
    thumbnail: "https://images.unsplash.com/photo-1581094271901-8022df4466f9?w=400",
  },
  {
    id: "6",
    title: "Mobile App Features",
    description: "Using HomeBase on the go with the mobile PWA",
    duration: "2:15",
    category: "Mobile",
    thumbnail: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=400",
  },
];

export default function Tutorials() {
  return (
    <div className="container max-w-6xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Tutorials & Help</h1>
        <p className="text-muted-foreground">
          Learn how to get the most out of HomeBase
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tutorials.map((tutorial) => (
          <Card key={tutorial.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
            <div className="relative aspect-video bg-muted">
              <img 
                src={tutorial.thumbnail} 
                alt={tutorial.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
                  <Play className="h-8 w-8 text-primary ml-1" />
                </div>
              </div>
              <Badge className="absolute top-2 right-2 bg-black/60 text-white">
                {tutorial.category}
              </Badge>
            </div>
            <CardHeader>
              <CardTitle className="text-lg">{tutorial.title}</CardTitle>
              <CardDescription className="flex items-center gap-2 text-xs">
                <Clock className="h-3 w-3" />
                {tutorial.duration}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {tutorial.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-12">
        <CardHeader>
          <CardTitle>Need More Help?</CardTitle>
          <CardDescription>
            Can't find what you're looking for? We're here to help.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          <a href="mailto:support@homebase.com" className="text-primary hover:underline">
            Contact Support
          </a>
          <a href="/resources" className="text-primary hover:underline">
            View Resources
          </a>
        </CardContent>
      </Card>
    </div>
  );
}