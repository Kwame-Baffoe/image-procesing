// components/MetadataDisplay.tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Camera, 
  Map, 
  Copyright, 
  Palette, 
  Info,
  Settings 
} from "lucide-react";

interface MetadataDisplayProps {
  metadata: ExtendedMetadata;
}

export const MetadataDisplay: React.FC<MetadataDisplayProps> = ({ metadata }) => {
  return (
    <Tabs defaultValue="basic" className="w-full">
      <TabsList className="grid grid-cols-6 w-full">
        <TabsTrigger value="basic">
          <Info className="w-4 h-4 mr-2" />
          Basic
        </TabsTrigger>
        <TabsTrigger value="technical">
          <Settings className="w-4 h-4 mr-2" />
          Technical
        </TabsTrigger>
        <TabsTrigger value="camera">
          <Camera className="w-4 h-4 mr-2" />
          Camera
        </TabsTrigger>
        <TabsTrigger value="location">
          <Map className="w-4 h-4 mr-2" />
          Location
        </TabsTrigger>
        <TabsTrigger value="copyright">
          <Copyright className="w-4 h-4 mr-2" />
          Copyright
        </TabsTrigger>
        <TabsTrigger value="color">
          <Palette className="w-4 h-4 mr-2" />
          Color
        </TabsTrigger>
      </TabsList>

      <TabsContent value="basic">
        <Card>
          <CardContent className="space-y-4 p-4">
            <MetadataSection
              items={[
                { label: "Dimensions", value: `${metadata.basic.width} × ${metadata.basic.height}` },
                { label: "Format", value: metadata.basic.format.toUpperCase() },
                { label: "Size", value: formatFileSize(metadata.basic.size) },
                { label: "Aspect Ratio", value: metadata.basic.aspectRatio },
                { label: "Bit Depth", value: `${metadata.basic.bitDepth || 'N/A'} bit` },
                { label: "Created", value: metadata.basic.created?.toString() || 'N/A' },
              ]}
            />
          </CardContent>
        </Card>
      </TabsContent>

      {/* Similar TabsContent for other sections... */}
      
      <TabsContent value="color">
        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="grid gap-4">
              <h3 className="font-medium">Color Palette</h3>
              <div className="flex gap-2">
                {metadata.color?.primaryColors.map((color, index) => (
                  <div
                    key={index}
                    className="w-12 h-12 rounded-lg shadow-sm"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
              
              {metadata.color?.dominantColors && (
                <div className="space-y-2">
                  <h3 className="font-medium">Dominant Colors</h3>
                  <div className="grid gap-2">
                    {metadata.color.dominantColors.map((color, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded"
                          style={{ backgroundColor: color.color }}
                        />
                        <span className="text-sm">{(color.percentage * 100).toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};