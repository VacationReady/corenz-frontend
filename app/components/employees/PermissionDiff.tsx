"use client";

import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  getScreenDisplayName,
  getActionDisplayName,
  PermissionAction,
  ScreenPermissions,
} from "@/lib/permissions";
import { Plus, Minus, Check } from "lucide-react";

interface PermissionDiffProps {
  oldPermissions: ScreenPermissions;
  newPermissions: ScreenPermissions;
}

export function PermissionDiff({
  oldPermissions,
  newPermissions,
}: PermissionDiffProps) {
  const getPermissionChanges = () => {
    const changes: {
      screen: string;
      added: PermissionAction[];
      removed: PermissionAction[];
      unchanged: PermissionAction[];
    }[] = [];

    // Get all unique screens from both permission sets
    const allScreens = new Set([
      ...Object.keys(oldPermissions),
      ...Object.keys(newPermissions),
    ]);

    for (const screen of allScreens) {
      const oldActions = oldPermissions[screen] || [];
      const newActions = newPermissions[screen] || [];

      const added = newActions.filter((action) => !oldActions.includes(action));
      const removed = oldActions.filter(
        (action) => !newActions.includes(action),
      );
      const unchanged = newActions.filter((action) =>
        oldActions.includes(action),
      );

      if (added.length > 0 || removed.length > 0 || unchanged.length > 0) {
        changes.push({
          screen,
          added,
          removed,
          unchanged,
        });
      }
    }

    return changes;
  };

  const changes = getPermissionChanges();

  if (changes.length === 0) {
    return (
      <div className="text-sm text-gray-500 text-center py-4">
        No permission changes detected
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {changes.map(({ screen, added, removed, unchanged }) => (
        <Card key={screen} className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {getScreenDisplayName(screen)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {/* Added permissions */}
            {added.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {added.map((action) => (
                  <Badge
                    key={`added-${action}`}
                    variant="default"
                    className="bg-green-100 text-green-800 border-green-200"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {getActionDisplayName(action)}
                  </Badge>
                ))}
              </div>
            )}

            {/* Removed permissions */}
            {removed.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {removed.map((action) => (
                  <Badge
                    key={`removed-${action}`}
                    variant="destructive"
                    className="bg-red-100 text-red-800 border-red-200"
                  >
                    <Minus className="h-3 w-3 mr-1" />
                    {getActionDisplayName(action)}
                  </Badge>
                ))}
              </div>
            )}

            {/* Unchanged permissions */}
            {unchanged.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {unchanged.map((action) => (
                  <Badge
                    key={`unchanged-${action}`}
                    variant="secondary"
                    className="bg-gray-100 text-gray-700"
                  >
                    <Check className="h-3 w-3 mr-1" />
                    {getActionDisplayName(action)}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
