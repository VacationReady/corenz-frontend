"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MapPin, Plus, Edit, Trash2, Save, X, Search, Globe } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import dynamic from "next/dynamic";

// Dynamic import of the Map component to avoid SSR issues with Leaflet
const LocationMap = dynamic(
  () => import("./LocationMap"),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-slate-100 dark:bg-slate-800 animate-pulse flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }
);

type Location = {
  id: string;
  name: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  geofenceRadius?: number | null;
  isActive: boolean;
};

type LocationFormData = {
  name: string;
  address: string;
  latitude: string;
  longitude: string;
  geofenceRadius: number;
  isActive: boolean;
};

export default function LocationsManagementPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [formDialog, setFormDialog] = useState<{
    open: boolean;
    mode: "create" | "edit";
    locationId?: string;
  }>({ open: false, mode: "create" });
  const [formData, setFormData] = useState<LocationFormData>({
    name: "",
    address: "",
    latitude: "",
    longitude: "",
    geofenceRadius: 100,
    isActive: true,
  });
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mapCenter, setMapCenter] = useState<[number, number]>([-41.2865, 174.7762]); // Wellington, NZ
  const { toast } = useToast();
  const [addressSearchLoading, setAddressSearchLoading] = useState(false);
  const [showCoordinates, setShowCoordinates] = useState(false);

  // Draggable marker logic
  const onMarkerDragEnd = useCallback((lat: number, lng: number) => {
    setFormData((prev) => ({
      ...prev,
      latitude: lat.toFixed(6),
      longitude: lng.toFixed(6),
    }));
  }, []);

  useEffect(() => {
    fetchLocations();
    // Try to get user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setMapCenter([position.coords.latitude, position.coords.longitude]);
        },
        () => {
          // Ignore error, use default
        }
      );
    }
  }, []);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/locations");
      if (!response.ok) throw new Error("Failed to fetch locations");
      const data = await response.json();
      setLocations(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load locations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateDialog = () => {
    setFormData({
      name: "",
      address: "",
      latitude: mapCenter[0].toString(),
      longitude: mapCenter[1].toString(),
      geofenceRadius: 100,
      isActive: true,
    });
    setFormDialog({ open: true, mode: "create" });
  };

  const handleOpenEditDialog = (location: Location) => {
    setFormData({
      name: location.name,
      address: location.address || "",
      latitude: location.latitude?.toString() || mapCenter[0].toString(),
      longitude: location.longitude?.toString() || mapCenter[1].toString(),
      geofenceRadius: location.geofenceRadius || 100,
      isActive: location.isActive,
    });
    setFormDialog({ open: true, mode: "edit", locationId: location.id });
  };

  const handleCloseDialog = () => {
    setFormDialog({ open: false, mode: "create" });
    setFormData({
      name: "",
      address: "",
      latitude: "",
      longitude: "",
      geofenceRadius: 100,
      isActive: true,
    });
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Location name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);

      const payload: any = {
        name: formData.name.trim(),
        address: formData.address.trim() || undefined,
        geofenceRadius: formData.geofenceRadius,
        isActive: formData.isActive,
      };

      // Add coordinates if provided
      if (formData.latitude && formData.longitude) {
        const lat = parseFloat(formData.latitude);
        const lng = parseFloat(formData.longitude);

        if (isNaN(lat) || isNaN(lng)) {
          toast({
            title: "Error",
            description: "Invalid coordinates",
            variant: "destructive",
          });
          return;
        }

        payload.latitude = lat;
        payload.longitude = lng;
      }

      let response;
      if (formDialog.mode === "create") {
        response = await fetch("/api/locations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        response = await fetch(`/api/locations/${formDialog.locationId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save location");
      }

      toast({
        title: "Success",
        description: `Location ${formDialog.mode === "create" ? "created" : "updated"} successfully`,
      });

      handleCloseDialog();
      fetchLocations();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save location",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (locationId: string) => {
    if (!confirm("Are you sure you want to delete this location?")) {
      return;
    }

    try {
      const response = await fetch(`/api/locations/${locationId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete location");

      toast({
        title: "Success",
        description: "Location deleted successfully",
      });

      fetchLocations();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete location",
        variant: "destructive",
      });
    }
  };

  const handleAddressSearch = async () => {
    if (!formData.address) return;
    
    try {
      setAddressSearchLoading(true);
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formData.address)}`);
      const data = await response.json();
      
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        setFormData(prev => ({
          ...prev,
          latitude: lat,
          longitude: lon,
        }));
        toast({
          title: "Location Found",
          description: "Map updated to address coordinates",
        });
      } else {
        toast({
          title: "Not Found",
          description: "Could not find coordinates for this address",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to search address",
        variant: "destructive"
      });
    } finally {
      setAddressSearchLoading(false);
    }
  };

  const filteredLocations = locations.filter((loc) =>
    loc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const locationsWithCoordinates = filteredLocations.filter(
    (loc) => loc.latitude !== null && loc.longitude !== null
  );

  // Calculate map center for the dialog map
  const dialogMapCenter: [number, number] = useMemo(() => {
    const lat = parseFloat(formData.latitude);
    const lng = parseFloat(formData.longitude);
    if (!isNaN(lat) && !isNaN(lng)) {
      return [lat, lng];
    }
    return mapCenter;
  }, [formData.latitude, formData.longitude, mapCenter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Location Management
          </h1>
          <p className="text-muted-foreground">
            Manage work locations and geofence boundaries
          </p>
        </div>
        <Button 
          onClick={handleOpenCreateDialog} 
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Location
        </Button>
      </div>

      <div className="relative max-w-md mb-8">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search locations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 bg-white/50 backdrop-blur-sm border-white/20"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredLocations.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-muted-foreground bg-white/50 rounded-3xl border border-dashed border-slate-300">
            <div className="bg-slate-100 p-4 rounded-full mb-4">
              <MapPin className="w-8 h-8 opacity-50" />
            </div>
            <p className="text-lg font-medium">No locations found</p>
            <p className="text-sm text-slate-500 mt-1">Add a location to get started with geofencing</p>
          </div>
        ) : (
          filteredLocations.map((location) => (
            <Card 
              key={location.id} 
              className={`group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-white/20 ${
                !location.isActive ? 'opacity-75 bg-slate-50 border-slate-200' : 'bg-white/40 backdrop-blur-md border-white/40'
              }`}
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl shadow-sm ${
                      location.isActive 
                        ? 'bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600' 
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-semibold text-slate-900">{location.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1.5">
                          {!location.isActive && (
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                              Inactive
                            </span>
                          )}
                          <span className="text-xs text-slate-500 flex items-center gap-1.5 bg-white/50 px-2 py-0.5 rounded-full border border-white/20">
                            <div className={`w-1.5 h-1.5 rounded-full ${location.isActive ? 'bg-green-500' : 'bg-slate-400'}`} />
                            {location.geofenceRadius || 100}m radius
                          </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 hover:bg-blue-50 hover:text-blue-600 rounded-full"
                      onClick={() => handleOpenEditDialog(location)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 hover:bg-red-50 hover:text-red-600 rounded-full"
                      onClick={() => handleDelete(location.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3 pt-1">
                  <div className="flex items-start gap-2.5 text-sm text-slate-600 bg-white/30 p-3 rounded-lg">
                    <MapPin className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
                    {location.address ? (
                      <p className="leading-relaxed">{location.address}</p>
                    ) : (
                      <p className="italic text-slate-400">No address provided</p>
                    )}
                  </div>
                  
                  {location.latitude && location.longitude && (
                    <div className="flex items-center gap-2 text-xs text-slate-500 pl-1">
                      <Globe className="w-3.5 h-3.5" />
                      <span className="font-mono">
                        {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Location Form Dialog */}
      <Dialog open={formDialog.open} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-slate-50 dark:bg-slate-900 border-none shadow-2xl">
          <div className="flex flex-col h-full">
            <DialogHeader className="p-6 bg-white dark:bg-slate-950 border-b z-10 shrink-0">
              <DialogTitle className="text-xl font-bold text-slate-900">
                {formDialog.mode === "create" ? "Create Geofence Location" : "Edit Geofence Location"}
              </DialogTitle>
              <DialogDescription className="text-slate-500">
                Drag the marker to position the location. Drag the slider to adjust geofence radius.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-1 min-h-0 flex-col lg:flex-row">
              {/* Left Panel: Map */}
              <div className="flex-1 relative bg-slate-100 min-h-[300px] lg:min-h-0">
                {formDialog.open && (
                   <LocationMap
                     center={dialogMapCenter}
                     zoom={18}
                     interactive={true}
                     draggableMarkerPosition={dialogMapCenter}
                     onMarkerDragEnd={onMarkerDragEnd}
                     geofenceRadius={formData.geofenceRadius}
                   />
                )}
                
                {/* Map Overlay Controls */}
                <div className="absolute bottom-6 left-6 right-6 z-[400] bg-white/95 backdrop-blur-sm p-5 rounded-2xl shadow-xl border border-white/20 max-w-md mx-auto">
                   <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="font-semibold text-slate-900">Geofence Radius</Label>
                        <span className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                          {formData.geofenceRadius} meters
                        </span>
                      </div>
                      <Slider
                        value={[formData.geofenceRadius]}
                        onValueChange={([value]) =>
                          setFormData({ ...formData, geofenceRadius: value })
                        }
                        min={20}
                        max={1000}
                        step={10}
                        className="w-full"
                      />
                      <p className="text-xs text-slate-500 text-center">
                        Employees must be within this green circle to clock in.
                      </p>
                   </div>
                </div>
              </div>

              {/* Right Panel: Form */}
              <div className="w-full lg:w-[400px] bg-white dark:bg-slate-950 border-l overflow-y-auto p-6 shrink-0 z-10 shadow-xl">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-slate-900 font-semibold">Location Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Head Office"
                      className="bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address" className="text-slate-900 font-semibold">Address / Postcode</Label>
                    <div className="flex gap-2">
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="Enter street address or postcode..."
                        className="bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                        onKeyDown={(e) => e.key === 'Enter' && handleAddressSearch()}
                      />
                      <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={handleAddressSearch}
                        disabled={addressSearchLoading}
                        className="shrink-0 bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100 hover:border-blue-300 transition-colors"
                        title="Find location on map"
                      >
                        {addressSearchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Click search to locate by address/postcode, or drag the map marker.
                    </p>
                  </div>

                  <div className="pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowCoordinates(!showCoordinates)}
                      className="text-xs text-muted-foreground h-auto p-0 hover:text-blue-600 hover:bg-transparent"
                    >
                      {showCoordinates ? "Hide Coordinates" : "Show Coordinates (Advanced)"}
                    </Button>
                  </div>

                  {showCoordinates && (
                    <div className="grid grid-cols-2 gap-4 pt-2 animate-in slide-in-from-top-2 fade-in duration-200">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Latitude</Label>
                        <Input
                          value={formData.latitude}
                          onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                          className="font-mono text-xs bg-slate-50"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Longitude</Label>
                        <Input
                          value={formData.longitude}
                          onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                          className="font-mono text-xs bg-slate-50"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="space-y-0.5">
                      <Label htmlFor="isActive" className="text-base font-medium text-slate-900">Active Location</Label>
                      <p className="text-xs text-muted-foreground">Enable for clock-ins</p>
                    </div>
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, isActive: checked })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="p-4 bg-white dark:bg-slate-950 border-t shrink-0">
              <Button variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 shadow-lg hover:shadow-xl transition-all"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {formDialog.mode === "create" ? "Create Location" : "Save Changes"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
