import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PortfolioImage {
  id: string;
  image_url: string;
  title?: string;
  description?: string;
  category?: string;
}

interface PortfolioGalleryProps {
  images: PortfolioImage[];
}

export function PortfolioGallery({ images }: PortfolioGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<PortfolioImage | null>(null);

  if (images.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No portfolio images yet</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map((image) => (
          <button
            key={image.id}
            onClick={() => setSelectedImage(image)}
            className="group relative aspect-square overflow-hidden rounded-lg border bg-muted hover:opacity-90 transition-opacity"
          >
            <img
              src={image.image_url}
              alt={image.title || "Portfolio image"}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {image.title && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-white text-sm font-medium truncate">
                  {image.title}
                </p>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Lightbox */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl p-0">
          {selectedImage && (
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 z-10 bg-background/80 backdrop-blur"
                onClick={() => setSelectedImage(null)}
              >
                <X className="h-4 w-4" />
              </Button>
              
              <img
                src={selectedImage.image_url}
                alt={selectedImage.title || "Portfolio image"}
                className="w-full h-auto max-h-[80vh] object-contain"
              />
              
              {(selectedImage.title || selectedImage.description) && (
                <div className="p-4 border-t bg-background">
                  {selectedImage.title && (
                    <h3 className="font-semibold mb-1">{selectedImage.title}</h3>
                  )}
                  {selectedImage.description && (
                    <p className="text-sm text-muted-foreground">
                      {selectedImage.description}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}