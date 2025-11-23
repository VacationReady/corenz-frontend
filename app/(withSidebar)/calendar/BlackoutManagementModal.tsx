"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/Card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import Button from "@/components/ui/Button";
import { toast } from "sonner";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { getEventCategoryIcon } from "@/lib/event-category-icons";

interface EventCategory {
  id: string;
  name: string;
  iconKey?: string | null;
}

interface BlackoutDay {
  id: string;
  date: string;
  allEvents: boolean;
  eventCategoryIds: string[];
  note?: string;
}

export default function BlackoutManagementModal({
  open,
  setOpen,
  defaultDate,
  refreshEvents,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  defaultDate?: Date | null;
  refreshEvents: () => void;
}) {
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [blackoutDays, setBlackoutDays] = useState<BlackoutDay[]>([]);
  const [newBlackoutDate, setNewBlackoutDate] = useState<Date>(new Date());
  const [newBlackoutCategories, setNewBlackoutCategories] = useState<string[]>([]);
  const [allEventsBlackout, setAllEventsBlackout] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open]);

  useEffect(() => {
    if (defaultDate && open) {
      setNewBlackoutDate(defaultDate);
    }
  }, [defaultDate, open]);

  const fetchData = async () => {
    try {
      const [catRes, blackoutRes] = await Promise.all([
        fetch("/api/event-categories"),
        fetch("/api/blackout-days/get"),
      ]);

      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(catData);
      }

      if (blackoutRes.ok) {
        const blackoutData = await blackoutRes.json();
        setBlackoutDays(blackoutData);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Failed to load blackout data");
    }
  };

  const addBlackoutDay = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/blackout-days/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: newBlackoutDate.toISOString(),
          allEvents: allEventsBlackout,
          eventCategoryIds: allEventsBlackout ? [] : newBlackoutCategories,
        }),
      });

      if (response.ok) {
        toast.success("Blackout day added successfully");
        setNewBlackoutCategories([]);
        setAllEventsBlackout(false);
        await fetchData();
        refreshEvents();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to add blackout day");
      }
    } catch (error) {
      console.error(error);
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const removeBlackoutDay = async (blackoutId: string) => {
    try {
      const response = await fetch("/api/blackout-days/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blackoutDayId: blackoutId }),
      });

      if (response.ok) {
        toast.success("Blackout day removed successfully");
        await fetchData();
        refreshEvents();
      } else {
        toast.error("Failed to remove blackout day");
      }
    } catch (error) {
      console.error(error);
      toast.error("An unexpected error occurred");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Blackout Days Management
          </DialogTitle>
          <DialogDescription>
            Add and manage blackout dates that prevent leave bookings
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="add" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="add">Add Blackout</TabsTrigger>
            <TabsTrigger value="list">Current Blackouts</TabsTrigger>
          </TabsList>

          <TabsContent value="add" className="space-y-4 mt-4">
            <div>
              <Label>Blackout Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(newBlackoutDate, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={newBlackoutDate}
                    onSelect={(date) => date && setNewBlackoutDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={allEventsBlackout}
                onChange={setAllEventsBlackout}
              />
              <Label>Block all event types</Label>
            </div>

            {!allEventsBlackout && (
              <div>
                <Label className="mb-2 block">Select Event Categories</Label>
                <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto p-3 border border-border rounded-lg">
                  {categories.map((cat) => {
                    const Icon = getEventCategoryIcon(cat.iconKey);
                    return (
                      <div
                        key={cat.id}
                        className="flex items-center space-x-2"
                      >
                        <input
                          type="checkbox"
                          id={`cat-${cat.id}`}
                          checked={newBlackoutCategories.includes(cat.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewBlackoutCategories([
                                ...newBlackoutCategories,
                                cat.id,
                              ]);
                            } else {
                              setNewBlackoutCategories(
                                newBlackoutCategories.filter(
                                  (id) => id !== cat.id,
                                ),
                              );
                            }
                          }}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <Label
                          htmlFor={`cat-${cat.id}`}
                          className="text-sm flex items-center gap-2 cursor-pointer"
                        >
                          <Icon className="h-4 w-4" />
                          {cat.name}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <Button 
              onClick={addBlackoutDay} 
              className="w-full" 
              disabled={loading}
              loading={loading}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Blackout Day
            </Button>
          </TabsContent>

          <TabsContent value="list" className="flex-1 overflow-y-auto">
            <div className="space-y-2 pr-2">
              {blackoutDays.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No blackout days configured</p>
                  <p className="text-sm mt-1">Switch to the &quot;Add Blackout&quot; tab to create one</p>
                </div>
              ) : (
                blackoutDays
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .map((blackout) => (
                    <Card key={blackout.id} className="hover:border-primary/50 transition-colors">
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-base mb-1">
                              {format(new Date(blackout.date), "EEEE, d MMMM yyyy")}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {blackout.allEvents ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-700 rounded-full text-xs font-medium">
                                  All events blocked
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-50 text-orange-700 rounded-full text-xs font-medium">
                                  {blackout.eventCategoryIds.length} {blackout.eventCategoryIds.length === 1 ? 'category' : 'categories'} blocked
                                </span>
                              )}
                            </div>
                            {blackout.note && (
                              <div className="text-xs text-muted-foreground mt-2 italic">
                                {blackout.note}
                              </div>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeBlackoutDay(blackout.id)}
                            className="hover:bg-destructive hover:text-destructive-foreground"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

