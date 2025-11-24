"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MapPin, Plus, Edit, Trash2, Save, X, Search } from "lucide-react";
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

  const onMarkerDragEnd = useCallback((lat: number, lng: number) => {
    setFormData((prev) => ({
      ...prev,
      latitude: lat.toFixed(6),
      longitude: lng.toFixed(6),
    }));
  }, []);

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
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
          Location Management
        </h1>
        <p className="text-muted-foreground">
          Manage work locations and geofence boundaries. Drag markers to adjust locations.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Map View (Read Only / Overview) */}
        <div className="lg:col-span-2 order-2 lg:order-1">
          <Card className="backdrop-blur-md bg-white/10 border-white/20 h-[700px] flex flex-col">
            <CardHeader>
              <CardTitle>Overview Map</CardTitle>
              <CardDescription>All active geofences</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 p-0 overflow-hidden relative rounded-b-xl">
               <LocationMap 
                 center={mapCenter}
                 locations={locationsWithCoordinates}
                 interactive={false}
               />
            </CardContent>
          </Card>
        </div>

        {/* Locations List */}
        <div className="space-y-6 order-1 lg:order-2">
          <Card className="backdrop-blur-md bg-white/10 border-white/20 max-h-[700px] flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Locations</CardTitle>
                <Button onClick={handleOpenCreateDialog} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Add New
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 flex-1 overflow-y-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search locations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="space-y-2">
                {filteredLocations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No locations found</p>
                  </div>
                ) : (
                  filteredLocations.map((location) => (
                    <div
                      key={location.id}
                      className={`p-4 rounded-lg border transition-all hover:shadow-md ${
                        !location.isActive ? 'opacity-60 bg-slate-50' : 'bg-white border-slate-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 cursor-pointer" onClick={() => handleOpenEditDialog(location)}>
                          <div className="flex items-center gap-2">
                            <MapPin className={`w-4 h-4 ${location.isActive ? 'text-blue-500' : 'text-slate-400'}`} />
                            <p className="font-medium text-slate-900">{location.name}</p>
                          </div>
                          {location.address && (
                            <p className="text-sm text-slate-500 mt-1 truncate">
                              {location.address}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-2">
                             <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                              {location.geofenceRadius || 100}m radius
                            </span>
                            {!location.isActive && (
                              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                                Inactive
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-500 hover:text-blue-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditDialog(location);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-500 hover:text-red-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(location.id);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Location Form Dialog */}
      <Dialog open={formDialog.open} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-slate-50 dark:bg-slate-900">
          <div className="flex flex-col h-full">
            <DialogHeader className="p-6 bg-white dark:bg-slate-950 border-b z-10 shrink-0">
              <DialogTitle className="text-xl">
                {formDialog.mode === "create" ? "Create Geofence Location" : "Edit Geofence Location"}
              </DialogTitle>
              <DialogDescription>
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
                <div className="absolute bottom-6 left-6 right-6 z-[400] bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-slate-200 max-w-md">
                   <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="font-semibold text-slate-900">Geofence Radius</Label>
                        <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">{formData.geofenceRadius} meters</span>
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
                      <p className="text-xs text-slate-500">
                        Drag slider to resize the green zone. Employees must be within this circle to clock in.
                      </p>
                   </div>
                </div>
              </div>

              {/* Right Panel: Form */}
              <div className="w-full lg:w-[400px] bg-white dark:bg-slate-950 border-l overflow-y-auto p-6 shrink-0 z-10 shadow-xl">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-slate-900 font-medium">Location Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Head Office"
                      className="bg-slate-50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address" className="text-slate-900 font-medium">Address Search</Label>
                    <div className="flex gap-2">
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="Search address to auto-locate..."
                        className="bg-slate-50"
                        onKeyDown={(e) => e.key === 'Enter' && handleAddressSearch()}
                      />
                      <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={handleAddressSearch}
                        disabled={addressSearchLoading}
                        className="shrink-0"
                      >
                        {addressSearchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Click search to automatically find coordinates and move the map.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
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

                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
                    <div className="space-y-0.5">
                      <Label htmlFor="isActive" className="text-base">Active Location</Label>
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
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8"
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
