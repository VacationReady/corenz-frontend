"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Sparkles,
  Users,
  Target,
  Clock,
  Globe,
  Building,
  GraduationCap,
  UserCheck,
  TrendingUp,
  Archive,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const journeyScopingSchema = z.object({
  name: z.string().min(1, "Journey name is required"),
  description: z.string().optional(),
  persona: z.string().min(1, "Target persona is required"),
  duration: z.number().min(1).max(365),
  category: z.string().min(1, "Category is required"),
  businessGoals: z.array(z.string()).min(1, "At least one business goal is required"),
  geography: z.string().optional(),
  lifecycleStage: z.string().optional(),
  customGoals: z.string().optional(),
});

type JourneyScopingForm = z.infer<typeof journeyScopingSchema>;

interface JourneyScopingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: JourneyScopingForm) => void;
}

const JOURNEY_CATEGORIES = [
  { id: "onboarding", name: "Onboarding", icon: <UserCheck className="w-4 h-4" />, description: "Welcome new employees" },
  { id: "development", name: "Development", icon: <TrendingUp className="w-4 h-4" />, description: "Grow existing talent" },
  { id: "training", name: "Training", icon: <GraduationCap className="w-4 h-4" />, description: "Build specific skills" },
  { id: "performance", name: "Performance", icon: <Target className="w-4 h-4" />, description: "Manage performance cycles" },
  { id: "offboarding", name: "Offboarding", icon: <Archive className="w-4 h-4" />, description: "Graceful departures" },
];

const PERSONA_OPTIONS = [
  "New Hire",
  "Manager", 
  "Senior Engineer",
  "Executive",
  "Remote Worker",
  "Intern",
  "Contractor",
  "Team Lead",
  "Sales Rep",
  "Customer Success",
];

const BUSINESS_GOALS = [
  "Reduce time to productivity",
  "Improve employee satisfaction",
  "Increase retention rates",
  "Enhance skill development",
  "Streamline processes",
  "Boost engagement scores",
  "Accelerate career progression",
  "Strengthen company culture",
  "Improve manager effectiveness",
  "Reduce administrative burden",
];

const GEOGRAPHY_OPTIONS = [
  "Global",
  "North America",
  "Europe",
  "Asia Pacific",
  "Remote-First",
  "Hybrid",
];

const LIFECYCLE_STAGES = [
  "Pre-boarding",
  "First Day",
  "First Week", 
  "First Month",
  "First Quarter",
  "First Year",
  "Ongoing",
  "Transition",
  "Exit",
];

export function JourneyScopingDialog({ isOpen, onClose, onConfirm }: JourneyScopingDialogProps) {
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);

  const form = useForm<JourneyScopingForm>({
    resolver: zodResolver(journeyScopingSchema),
    defaultValues: {
      name: "",
      description: "",
      persona: "",
      duration: 30,
      category: "",
      businessGoals: [],
      geography: "Global",
      lifecycleStage: "",
      customGoals: "",
    },
  });

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async (data: JourneyScopingForm) => {
    setIsGenerating(true);
    
    // Simulate AI generation delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    onConfirm(data);
    setIsGenerating(false);
    handleClose();
  };

  const handleClose = () => {
    form.reset();
    setStep(1);
    setIsGenerating(false);
    onClose();
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Sparkles className="w-12 h-12 mx-auto text-primary mb-4" />
        <h3 className="text-lg font-semibold mb-2">Let's Design Your Journey</h3>
        <p className="text-muted-foreground">
          Tell us about the experience you want to create, and our AI will generate a personalized journey template.
        </p>
      </div>

      <div className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Journey Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Software Engineer Onboarding" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Describe the purpose and goals of this journey..."
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Journey Category</FormLabel>
              <div className="grid grid-cols-2 gap-3">
                {JOURNEY_CATEGORIES.map((category) => (
                  <Card
                    key={category.id}
                    className={cn(
                      "cursor-pointer transition-all hover:shadow-md",
                      field.value === category.id
                        ? "border-primary bg-primary/5"
                        : "border-gray-200"
                    )}
                    onClick={() => field.onChange(category.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 rounded-lg">
                          {category.icon}
                        </div>
                        <div>
                          <h4 className="font-medium text-sm">{category.name}</h4>
                          <p className="text-xs text-muted-foreground">{category.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Users className="w-12 h-12 mx-auto text-primary mb-4" />
        <h3 className="text-lg font-semibold mb-2">Define Your Audience</h3>
        <p className="text-muted-foreground">
          Help us understand who will be going through this journey.
        </p>
      </div>

      <div className="space-y-4">
        <FormField
          control={form.control}
          name="persona"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Target Persona</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select target persona" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {PERSONA_OPTIONS.map((persona) => (
                    <SelectItem key={persona} value={persona}>
                      {persona}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="geography"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Geography</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select geography" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {GEOGRAPHY_OPTIONS.map((geo) => (
                    <SelectItem key={geo} value={geo}>
                      {geo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="lifecycleStage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Lifecycle Stage</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select lifecycle stage" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {LIFECYCLE_STAGES.map((stage) => (
                    <SelectItem key={stage} value={stage}>
                      {stage}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="duration"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Expected Duration: {field.value} days</FormLabel>
              <FormControl>
                <Slider
                  min={1}
                  max={365}
                  step={1}
                  value={[field.value]}
                  onValueChange={(value) => field.onChange(value[0])}
                  className="w-full"
                />
              </FormControl>
              <FormDescription>
                How long should this journey take from start to finish?
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Target className="w-12 h-12 mx-auto text-primary mb-4" />
        <h3 className="text-lg font-semibold mb-2">Set Your Goals</h3>
        <p className="text-muted-foreground">
          What outcomes do you want to achieve with this journey?
        </p>
      </div>

      <FormField
        control={form.control}
        name="businessGoals"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Business Goals</FormLabel>
            <div className="grid grid-cols-2 gap-2">
              {BUSINESS_GOALS.map((goal) => (
                <div key={goal} className="flex items-center space-x-2">
                  <Checkbox
                    id={goal}
                    checked={field.value.includes(goal)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        field.onChange([...field.value, goal]);
                      } else {
                        field.onChange(field.value.filter((g) => g !== goal));
                      }
                    }}
                  />
                  <Label htmlFor={goal} className="text-sm">
                    {goal}
                  </Label>
                </div>
              ))}
            </div>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="customGoals"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Additional Goals (Optional)</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Describe any specific goals or outcomes not listed above..."
                rows={3}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  const renderGenerating = () => (
    <div className="text-center py-8">
      <div className="relative">
        <Sparkles className="w-16 h-16 mx-auto text-primary mb-4 animate-pulse" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-20 h-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      </div>
      <h3 className="text-lg font-semibold mb-2">Generating Your Journey</h3>
      <p className="text-muted-foreground mb-4">
        Our AI is creating a personalized journey template based on your requirements...
      </p>
      <div className="space-y-2 text-sm text-muted-foreground">
        <div className="flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          <span>Analyzing your requirements</span>
        </div>
        <div className="flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          <span>Selecting optimal phases</span>
        </div>
        <div className="flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          <span>Creating experience blocks</span>
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Design New Journey</DialogTitle>
          <DialogDescription>
            Create a personalized employee journey with AI assistance
          </DialogDescription>
        </DialogHeader>

        {isGenerating ? (
          renderGenerating()
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {/* Progress Indicator */}
              <div className="flex items-center justify-center space-x-4">
                {[1, 2, 3].map((stepNum) => (
                  <div key={stepNum} className="flex items-center">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                        step >= stepNum
                          ? "bg-primary text-primary-foreground"
                          : "bg-gray-200 text-gray-600"
                      )}
                    >
                      {stepNum}
                    </div>
                    {stepNum < 3 && (
                      <div
                        className={cn(
                          "w-12 h-0.5 mx-2",
                          step > stepNum ? "bg-primary" : "bg-gray-200"
                        )}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Step Content */}
              {step === 1 && renderStep1()}
              {step === 2 && renderStep2()}
              {step === 3 && renderStep3()}

              <DialogFooter className="flex justify-between">
                <div className="flex gap-2">
                  {step > 1 && (
                    <Button type="button" variant="outline" onClick={handleBack}>
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                  {step < 3 ? (
                    <Button type="button" onClick={handleNext}>
                      Next
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  ) : (
                    <Button type="submit">
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Journey
                    </Button>
                  )}
                </div>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
