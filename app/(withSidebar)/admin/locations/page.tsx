"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MapPin, Plus, Edit, Trash2, Save, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import dynamic from "next/dynamic";

// Dynamically import map components (client-side only)
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);
const Circle = dynamic(
  () => import("react-leaflet").then((mod) => mod.Circle),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
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
      latitude: "",
      longitude: "",
      geofenceRadius: 100,
      isActive: true,
    });
    setFormDialog({ open: true, mode: "create" });
  };

  const handleOpenEditDialog = (location: Location) => {
    setFormData({
      name: location.name,
      address: location.address || "",
      latitude: location.latitude?.toString() || "",
      longitude: location.longitude?.toString() || "",
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

  const filteredLocations = locations.filter((loc) =>
    loc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const locationsWithCoordinates = filteredLocations.filter(
    (loc) => loc.latitude !== null && loc.longitude !== null
  );

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
          Manage work locations and geofence boundaries
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map View */}
        <div className="lg:col-span-2">
          <Card className="backdrop-blur-md bg-white/10 border-white/20">
            <CardHeader>
              <CardTitle>Location Map</CardTitle>
              <CardDescription>View all locations with geofence boundaries</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[600px] rounded-lg overflow-hidden">
                {typeof window !== "undefined" && (
                  <MapContainer
                    center={mapCenter}
                    zoom={13}
                    style={{ height: "100%", width: "100%" }}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    {locationsWithCoordinates.map((location) => (
                      <div key={location.id}>
                        <Marker
                          position={[location.latitude!, location.longitude!]}
                        >
                          <Popup>
                            <div className="p-2">
                              <p className="font-bold">{location.name}</p>
                              {location.address && (
                                <p className="text-sm text-gray-600">{location.address}</p>
                              )}
                              <p className="text-sm mt-2">
                                Geofence: {location.geofenceRadius || 100}m
                              </p>
                            </div>
                          </Popup>
                        </Marker>
                        <Circle
                          center={[location.latitude!, location.longitude!]}
                          radius={location.geofenceRadius || 100}
                          pathOptions={{
                            color: "#3B82F6",
                            fillColor: "#3B82F6",
                            fillOpacity: 0.2,
                          }}
                        />
                      </div>
                    ))}
                  </MapContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Locations List */}
        <div className="space-y-6">
          <Card className="backdrop-blur-md bg-white/10 border-white/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Locations</CardTitle>
                <Button onClick={handleOpenCreateDialog} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Search locations..."
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              />

              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {filteredLocations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No locations found</p>
                  </div>
                ) : (
                  filteredLocations.map((location) => (
                    <div
                      key={location.id}
                      className="p-4 rounded-lg border border-white/10 hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-blue-500" />
                            <p className="font-medium">{location.name}</p>
                          </div>
                          {location.address && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {location.address}
                            </p>
                          )}
                          {location.latitude && location.longitude && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Radius: {location.geofenceRadius || 100}m
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEditDialog(location)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(location.id)}
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {formDialog.mode === "create" ? "Add Location" : "Edit Location"}
            </DialogTitle>
            <DialogDescription>
              Configure location details and geofence settings
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="name">Location Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Main Office"
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="123 Main St, City"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="0.000001"
                  value={formData.latitude}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, latitude: e.target.value })}
                  placeholder="-41.2865"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="0.000001"
                  value={formData.longitude}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, longitude: e.target.value })}
                  placeholder="174.7762"
                />
              </div>

              <div className="col-span-2 space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Geofence Radius</Label>
                  <span className="text-sm font-medium">{formData.geofenceRadius}m</span>
                </div>
                <Slider
                  value={[formData.geofenceRadius]}
                  onValueChange={([value]) =>
                    setFormData({ ...formData, geofenceRadius: value })
                  }
                  min={50}
                  max={5000}
                  step={50}
                />
                <p className="text-xs text-muted-foreground">
                  Employees must be within this radius to clock in/out
                </p>
              </div>

              <div className="col-span-2 flex items-center justify-between">
                <Label htmlFor="isActive">Active</Label>
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

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {formDialog.mode === "create" ? "Create" : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
