import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Image, Star, Link as LinkIcon, Globe } from "lucide-react";

export default function AccountIndex() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Account</h1>
        <p className="text-muted-foreground">
          Manage your public profile, portfolio, and brand presence
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link to="/provider/account/profile">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardHeader>
              <div className="flex items-center justify-between">
                <User className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Profile</CardTitle>
              <CardDescription>
                Manage your logo, hero image, bio, service area, and business hours
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link to="/provider/account/portfolio">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Image className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Portfolio</CardTitle>
              <CardDescription>
                Upload and manage photos showcasing your best work
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link to="/provider/account/reviews">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Star className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Reviews</CardTitle>
              <CardDescription>
                View customer reviews and respond to feedback
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link to="/provider/account/share-links">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardHeader>
              <div className="flex items-center justify-between">
                <LinkIcon className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Share Links</CardTitle>
              <CardDescription>
                Create branded booking links and QR codes for marketing
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link to="/provider/account/social">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Globe className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Social Links</CardTitle>
              <CardDescription>
                Connect your website, Instagram, Facebook, and other platforms
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
