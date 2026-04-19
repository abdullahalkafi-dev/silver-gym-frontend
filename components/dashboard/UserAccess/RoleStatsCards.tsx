import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { Settings03Icon } from "@hugeicons/core-free-icons";

interface RoleStatCard {
  title: string;
  count: number;
  description: string;
  suffix?: string;
}

interface RoleStatsCardsProps {
  stats: RoleStatCard[];
  onManageRole: () => void;
  actionDisabled?: boolean;
}

const RoleStatsCards: React.FC<RoleStatsCardsProps> = ({
  stats,
  onManageRole,
  actionDisabled = false,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.title} className="bg-white border-none hover:shadow-md">
          <CardContent className="px-6">
            <h3 className="text-gray-900 font-semibold text-base mb-1">
              {stat.title}
            </h3>
            <p className="text-gray-500 text-xs mb-3">{stat.description}</p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-gray-900">
                {stat.count}
              </span>
              {stat.suffix ? (
                <span className="text-gray-500 text-sm">{stat.suffix}</span>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ))}

      <Card className="bg-white border-2 border-dashed border-gray-200 hover:border-purple transition-colors cursor-pointer">
        <CardContent className="px-6">
          <h3 className="text-gray-900 font-semibold text-base mb-1">
            Manage Role Permissions
          </h3>
          <p className="text-gray-500 text-xs mb-4">
            Update the permission set of existing branch roles.
          </p>
          <Button
            onClick={onManageRole}
            variant="outline"
            disabled={actionDisabled}
            className="w-full bg-gray-100 hover:bg-gray-50 font-semibold disabled:cursor-not-allowed"
          >
            <HugeiconsIcon icon={Settings03Icon} size={24} strokeWidth={2} />{" "}
            Edit Permissions
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default RoleStatsCards;
