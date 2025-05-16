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
  resume: z.instanceof(File).optional()
    .refine(file => file && file.size <= 5 * 1024 * 1024, `Max file size is 5MB.`)
    .refine(file => file && file.type === 'application/pdf', `Only PDF files are allowed.`),
});

type ResumeFormValues = z.infer<typeof resumeFormSchema>;

interface ResumeUploadFormProps {
  onResumeParsed: (data: ParseResumeOutput) => void;
  initialData?: ParseResumeOutput;
}

export function ResumeUploadForm({ onResumeParsed, initialData }: ResumeUploadFormProps) {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParseResumeOutput | null>(initialData || null);
  const { toast } = useToast();

  const form = useForm<ResumeFormValues>({
    resolver: zodResolver(resumeFormSchema),
    defaultValues: {},
  });

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      form.setValue('resume', file);
      setFileName(file.name);
      setParsedData(null); // Clear previous parsed data on new file selection
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

    setIsUploading(true);
    setIsParsing(false);
    setUploadProgress(0);

    // Simulate upload progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
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
        clearInterval(interval); // Ensure progress interval is cleared
        setUploadProgress(100); // Set progress to 100%
        setIsUploading(false);
        setIsParsing(true);
        
        const base64data = reader.result as string;
        
        toast({
          title: 'Parsing Resume',
          description: 'Please wait while we extract information from your resume.',
        });

        try {
          const result = await parseResume({ resumeDataUri: base64data });
          setParsedData(result);
          onResumeParsed(result);
          toast({
            title: 'Resume Parsed Successfully',
            description: 'Your experience and skills have been extracted.',
          });
        } catch (error) {
          console.error('Error parsing resume:', error);
          toast({
            title: 'Error Parsing Resume',
            description: 'Could not parse the resume. Please try again or ensure it is a valid PDF.',
            variant: 'destructive',
          });
          setParsedData(null);
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
        title: 'Upload Failed',
        description: 'An unexpected error occurred during upload.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <FileText className="mr-2 h-6 w-6 text-primary" />
          Upload Your Resume
        </CardTitle>
        <CardDescription>
          Upload your PDF resume. We'll use AI to help populate your profile. Max 5MB.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="resume"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="resume-upload" className="sr-only">Resume</FormLabel>
                  <FormControl>
                    <div className="flex items-center space-x-2">
                       <Input
                        id="resume-upload"
                        type="file"
                        accept="application/pdf"
                        onChange={handleFileChange}
                        className="hidden"
                        disabled={isUploading || isParsing}
                      />
                      <label
                        htmlFor="resume-upload"
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
                  {isUploading ? `Uploading: ${uploadProgress}%` : 'Parsing resume with AI...'}
                </p>
              </div>
            )}

            <Button type="submit" disabled={isUploading || isParsing || !form.watch('resume')} className="w-full">
              {isParsing ? (
                <>
                  <Sparkles className="mr-2 h-4 w-4 animate-spin" /> Parsing...
                </>
              ) : isUploading ? (
                'Uploading...'
              ) : (
                <>
                  <UploadCloud className="mr-2 h-4 w-4" /> Upload & Parse Resume
                </>
              )}
            </Button>
          </form>
        </Form>

        {parsedData && (
          <div className="mt-8 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center"><Sparkles className="mr-2 h-5 w-5 text-primary" /> AI Extracted Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Experience Summary</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{parsedData.experience || 'No experience summary extracted.'}</p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Skills</h3>
                  {parsedData.skills && parsedData.skills.length > 0 ? (
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      {parsedData.skills.map((skill, index) => (
                        <li key={index}>{skill}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No skills extracted.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
