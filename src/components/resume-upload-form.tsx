
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
import { FileText, Sparkles, UploadCloud } from 'lucide-react';

const resumeFormSchema = z.object({
  resume: z.instanceof(File) // Make it required for this form submission
    .refine(file => file.size <= 5 * 1024 * 1024, `Max file size is 5MB.`)
    .refine(file => file.type === 'application/pdf', `Only PDF files are allowed.`),
});

type ResumeFormValues = z.infer<typeof resumeFormSchema>;

interface ResumeUploadFormProps {
  onResumeParsed: (data: { parsedData: ParseResumeOutput; file: File }) => void;
  initialData?: ParseResumeOutput; // Kept for potential initial display, though parsing is main action
}

export function ResumeUploadForm({ onResumeParsed, initialData }: ResumeUploadFormProps) {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
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
      setParsedDataDisplay(null); // Clear previous parsed data on new file selection
    }
  };

  const onSubmit = async (data: ResumeFormValues) => {
    if (!data.resume) { // Should be caught by zod, but good to double check
      toast({
        title: 'No file selected',
        description: 'Please select a PDF resume to upload.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    setIsParsing(false);
    setUploadProgress(0);

    // Simulate upload progress (since actual upload happens later on profile save)
    let progress = 0;
    const interval = setInterval(() => {
      progress += 20;
      if (progress <= 100) {
        setUploadProgress(progress);
      } else {
        clearInterval(interval);
      }
    }, 100);
    
    try {
      const reader = new FileReader();
      reader.readAsDataURL(data.resume);
      reader.onloadend = async () => {
        clearInterval(interval);
        setUploadProgress(100);
        setIsUploading(false);
        setIsParsing(true);
        
        const base64data = reader.result as string;
        
        toast({
          title: 'Parsing Resume',
          description: 'Please wait while we extract information from your resume.',
        });

        try {
          const result = await parseResume({ resumeDataUri: base64data });
          setParsedDataDisplay(result); // Update local display
          onResumeParsed({ parsedData: result, file: data.resume }); // Pass parsed data AND file to parent
          toast({
            title: 'Resume Processed & Ready for Profile Save',
            description: 'Extracted information has been updated in the form fields. Save your profile to upload the new resume.',
          });
        } catch (error) {
          console.error('Error parsing resume:', error);
          toast({
            title: 'Error Parsing Resume',
            description: 'Could not parse the resume. Please ensure it is a valid PDF.',
            variant: 'destructive',
          });
          setParsedDataDisplay(null);
        } finally {
          setIsParsing(false);
        }
      };
      reader.onerror = () => {
        clearInterval(interval);
        setIsUploading(false);
        toast({
          title: 'File Read Error',
          description: 'Could not read the selected file.',
          variant: 'destructive',
        });
      };
    } catch (error) {
      clearInterval(interval);
      setIsUploading(false);
      console.error('Error processing file upload:', error);
      toast({
        title: 'Processing Failed',
        description: 'An unexpected error occurred during processing.',
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
              render={({ field }) => ( // field is not directly used here, onChange is manual
                <FormItem>
                  <FormLabel htmlFor="resume-upload-profile" className="sr-only">Resume</FormLabel>
                  <FormControl>
                    <div className="flex items-center space-x-2">
                       <Input
                        id="resume-upload-profile"
                        type="file"
                        accept="application/pdf"
                        onChange={handleFileChange}
                        className="hidden"
                        disabled={isUploading || isParsing}
                      />
                      <label
                        htmlFor="resume-upload-profile"
                        className={`flex items-center justify-center w-full px-4 py-2 border-2 border-dashed rounded-md cursor-pointer
                                    hover:border-primary transition-colors
                                    ${isUploading || isParsing ? 'opacity-50 cursor-not-allowed' : ''}`}
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

            {(isUploading || isParsing) && (
              <div className="space-y-2">
                <Progress value={uploadProgress} className="w-full" />
                <p className="text-sm text-muted-foreground text-center">
                  {isUploading ? `Processing: ${uploadProgress}%` : 'Parsing resume with AI...'}
                </p>
              </div>
            )}

            <Button type="submit" disabled={isUploading || isParsing || !form.watch('resume')} className="w-full">
              {isParsing ? (
                <>
                  <Sparkles className="mr-2 h-4 w-4 animate-spin" /> Parsing...
                </>
              ) : isUploading ? (
                'Processing...'
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" /> Process Resume
                </>
              )}
            </Button>
          </form>
        </Form>

        {parsedDataDisplay && (
          <div className="mt-8 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center"><Sparkles className="mr-2 h-5 w-5 text-primary" /> AI Extracted Information (Preview)</CardTitle>
                <CardDescription>This information has been used to populate the fields above. It will be saved with your profile.</CardDescription>
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
