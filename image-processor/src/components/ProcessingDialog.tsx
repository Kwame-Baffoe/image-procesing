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