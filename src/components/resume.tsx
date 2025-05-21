'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { parseResume, type ParseResumeOutput } from '@/ai/flows/resume-parser';
import { useState, type ChangeEvent } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { FileText, Sparkles, UploadCloud, Loader2 } from 'lucide-react';

const resumeFormSchema = z.object({
  resume: z.instanceof(File) 
    .refine(file => file.size <= 5 * 1024 * 1024, `Max file size is 5MB.`)
    .refine(file => file.type === 'application/pdf', `Only PDF files are allowed. Please upload a valid PDF.`),
});

type ResumeFormValues = z.infer<typeof resumeFormSchema>;

interface ResumeUploadFormProps {
  onResumeParsed: (data: { parsedData: ParseResumeOutput; file: File }) => void;
  initialData?: ParseResumeOutput; 
}

export function ResumeUploadForm({ onResumeParsed, initialData }: ResumeUploadFormProps) {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessingFile, setIsProcessingFile] = useState(false); // Combined state for uploading/parsing
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedDataDisplay, setParsedDataDisplay] = useState<ParseResumeOutput | null>(initialData || null);
  const { toast } = useToast();

  const form = useForm<ResumeFormValues>({
    resolver: zodResolver(resumeFormSchema),
    defaultValues: {},
  });

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      form.setValue('resume', file, { shouldValidate: true });
      setFileName(file.name);
      setParsedDataDisplay(null); 
    } else {
      setFileName(null);
      form.setValue('resume', undefined); // Clear the file from the form if deselected
    }
  };

  const onSubmit = async (data: ResumeFormValues) => {
    if (!data.resume) {
      toast({
        title: 'No file selected',
        description: 'Please select a PDF resume to upload.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessingFile(true);
    setUploadProgress(0);
    
    // Simulate local file processing progress before AI call
    let progress = 0;
    const interval = setInterval(() => {
      progress += 20;
      if (progress <= 60) { // Stop at 60% to leave room for AI parsing indication
        setUploadProgress(progress);
      } else {
        clearInterval(interval);
      }
    }, 80);
    
    try {
      const reader = new FileReader();
      reader.readAsDataURL(data.resume);
      reader.onloadend = async () => {
        clearInterval(interval); // Ensure interval is cleared
        setUploadProgress(80); // Indicate file reading is done
        
        const base64data = reader.result as string;
        console.log('ResumeUploadForm: Data URI MIME type:', base64data.substring(0, base64data.indexOf(';')+1));
        
        toast({
          title: 'Parsing Resume with AI',
          description: 'Please wait, this may take a moment...',
        });

        try {
          const result = await parseResume({ resumeDataUri: base64data });
          setParsedDataDisplay(result); 
          onResumeParsed({ parsedData: result, file: data.resume }); 
          toast({
            title: 'Resume Processed',
            description: 'Extracted information updated. Save profile to upload the new resume file.',
          });
        } catch (error: any) {
          console.error('Detailed error from parseResume flow:', error);
          let errorMessage = 'Could not parse the resume. The AI service might be unavailable or the PDF is not processable.';
          if (error.message && error.message.toLowerCase().includes('api key not valid')) {
            errorMessage = 'AI Service Error: Invalid API Key. Please check configuration.';
          } else if (error.message) {
            errorMessage = `AI Processing Error: ${error.message.substring(0,100)}...`;
          }
          toast({
            title: 'Error Parsing Resume',
            description: errorMessage,
            variant: 'destructive',
            duration: 7000,
          });
          setParsedDataDisplay(null);
        } finally {
          setUploadProgress(100);
          setTimeout(() => setIsProcessingFile(false), 500); // Keep progress bar at 100% briefly
        }
      };
      reader.onerror = () => {
        clearInterval(interval);
        setIsProcessingFile(false);
        toast({
          title: 'File Read Error',
          description: 'Could not read the selected file.',
          variant: 'destructive',
        });
      };
    } catch (error) {
      clearInterval(interval);
      setIsProcessingFile(false);
      console.error('Error processing file for resume parsing:', error);
      toast({
        title: 'Processing Failed',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <FileText className="mr-2 h-6 w-6 text-primary" data-ai-hint="resume document"/>
          Upload & Parse Resume
        </CardTitle>
        <CardDescription>
          Upload a new PDF resume (max 5MB). AI will extract details to help populate your profile. The new resume file will be uploaded when you save your main profile.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="resume"
              render={() => ( 
                <FormItem>
                  <FormLabel htmlFor="resume-upload-form-input" className="sr-only">Resume</FormLabel>
                  <FormControl>
                    <div className="flex items-center space-x-2">
                       <Input
                        id="resume-upload-form-input"
                        type="file"
                        accept="application/pdf"
                        onChange={handleFileChange}
                        className="hidden"
                        disabled={isProcessingFile}
                      />
                      <label
                        htmlFor="resume-upload-form-input"
                        className={`flex items-center justify-center w-full px-4 py-2 border-2 border-dashed rounded-md cursor-pointer
                                    hover:border-primary transition-colors
                                    ${isProcessingFile ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <UploadCloud className="mr-2 h-5 w-5" />
                        <span>{fileName || 'Click to upload PDF'}</span>
                      </label>
                    </div>
                  </FormControl>
                  <FormDescription>
                    {fileName && `Selected file: ${fileName}`}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isProcessingFile && (
              <div className="space-y-2">
                <Progress value={uploadProgress} className="w-full" />
                <p className="text-sm text-muted-foreground text-center">
                  {uploadProgress < 80 ? `Processing file: ${uploadProgress}%` : 'Parsing resume with AI...'}
                </p>
              </div>
            )}

            <Button type="submit" disabled={isProcessingFile || !form.watch('resume')} className="w-full">
              {isProcessingFile ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              {isProcessingFile ? (uploadProgress < 80 ? 'Processing...' : 'Parsing...') : 'Process Resume'}
            </Button>
          </form>
        </Form>

        {parsedDataDisplay && (
          <div className="mt-8 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center"><Sparkles className="mr-2 h-5 w-5 text-primary" /> AI Extracted Information (Preview)</CardTitle>
                <CardDescription>This information has been used to populate the fields in the main profile form. Save your main profile to persist these changes and upload the new resume file.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Experience Summary</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{parsedDataDisplay.experience || 'No experience summary extracted.'}</p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Skills</h3>
                  {parsedDataDisplay.skills && parsedDataDisplay.skills.length > 0 ? (
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      {parsedDataDisplay.skills.map((skill, index) => (
                        <li key={index}>{skill}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No skills extracted.</p>
                  )}
                </div>
                 {parsedDataDisplay.education && (
                    <div>
                    <h3 className="text-lg font-semibold text-foreground">Education</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{parsedDataDisplay.education || 'No education information extracted.'}</p>
                    </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
