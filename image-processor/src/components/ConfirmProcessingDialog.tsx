// components/ConfirmProcessingDialog.tsx
import {
    
    AlertDialogAction,
    AlertDialogCancel,
 
    AlertDialogFooter,
    
  } from "@/components/ui/alert-dialog";
  import { AlertCircle, CheckCircle2 } from "lucide-react";
  import { UploadableFile, ProcessingOptions } from "@/types/image-processor"; // Create this types file
  
  interface ConfirmProcessingDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    files: UploadableFile[];
    options: ProcessingOptions;
    onConfirm: () => void;
    formatFileSize: (bytes: number) => string;
  }
  
  export function ConfirmProcessingDialog({
    open,
    onOpenChange,
    files,
    options,
    onConfirm,
    formatFileSize
  }: ConfirmProcessingDialogProps) {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Processing Settings</AlertDialogTitle>
            <AlertDialogDescription>
              Review your processing settings before continuing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Selected Files Section */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="font-medium">Selected Files</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {files.filter(f => f.status === 'success').map(file => (
                  <div key={file.id} className="flex items-center space-x-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="truncate">{file.file.name}</span>
                  </div>
                ))}
              </div>
            </div>
  
            {/* Processing Options Section */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="font-medium">Processing Options</div>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span>Output Format:</span>
                  <span className="font-medium">{options.format.toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Quality:</span>
                  <span className="font-medium">{options.quality}%</span>
                </div>
                {options.resize.enabled && (
                  <div className="flex justify-between">
                    <span>Resize:</span>
                    <span className="font-medium">
                      {options.resize.width} × {options.resize.height}px
                    </span>
                  </div>
                )}
                {options.compression.enabled && (
                  <div className="flex justify-between">
                    <span>Compression Level:</span>
                    <span className="font-medium">{options.compression.level}%</span>
                  </div>
                )}
              </div>
            </div>
  
            {/* Warning Section */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center text-sm text-yellow-800">
                <AlertCircle className="h-4 w-4 mr-2 shrink-0" />
                <span>Processing will modify your original images according to these settings.</span>
              </div>
            </div>
  
            {/* Metadata Display */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="font-medium mb-2">Image Information</div>
              <div className="grid gap-2 text-sm">
                {files.filter(f => f.metadata).map(file => (
                  <div key={file.id} className="border-b pb-2">
                    <p className="font-medium">{file.file.name}</p>
                    <div className="grid grid-cols-2 gap-x-4 mt-1 text-gray-600">
                      <p>Dimensions: {file.metadata?.width} × {file.metadata?.height}px</p>
                      <p>Format: {file.metadata?.format}</p>
                      <p>Color Space: {file.metadata?.colorSpace}</p>
                      <p>Size: {formatFileSize(file.file.size)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
  
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={onConfirm}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Confirm & Process
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }
  
  // components/ProcessingDialog.tsx
  import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogHeader,
    AlertDialogTitle,
  } from "@/components/ui/alert-dialog";
  import { Progress } from "@/components/ui/progress";
  import { Loader2 } from "lucide-react";
  
  interface ProcessingDialogProps {
    open: boolean;
    progress: number;
  }
  
  export function ProcessingDialog({ open, progress }: ProcessingDialogProps) {
    return (
      <AlertDialog open={open}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Processing Images</AlertDialogTitle>
            <AlertDialogDescription>
              Please wait while your images are being processed...
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col items-center py-6 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-gray-500">
              Progress: {Math.round(progress)}%
            </p>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    );
  }