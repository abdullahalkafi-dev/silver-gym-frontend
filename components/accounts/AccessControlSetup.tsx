"use client";

import { useState } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/hooks/useUser";
import { toast } from "sonner";
import { extractApiErrorMessage } from "@/redux/features/auth/authMappers";
import {
  useCreateAccessDeviceMutation,
  useGetAccessDevicesQuery,
  useGetAccessSettingsQuery,
  useLazyGetDoorPlanQuery,
  useReleaseEveryoneMutation,
  useSyncAccessDeviceMutation,
  useSyncDoorAccessMutation,
  useTestAccessDeviceMutation,
  useTestDoorUserMutation,
  useUpdateAccessDeviceMutation,
  useUpdateAccessSettingsMutation,
} from "@/redux/features/access/accessApi";
import type { AccessDevice, DoorPlan } from "@/types/access";

const MAX_GRACE_DAYS = 31;

const formatSeen = (value: string | null) =>
  value
    ? new Date(value).toLocaleString("en-GB", {
        timeZone: "Asia/Dhaka",
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
      })
    : "never";

const errorText = (error: unknown) =>
  error instanceof Error ? error.message : extractApiErrorMessage(error);

const DoorChangesPanel = ({
  branchId,
  device,
  doorControlOn,
}: {
  branchId: string;
  device: AccessDevice;
  doorControlOn: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const [blockGroup, setBlockGroup] = useState<string | undefined>(undefined);
  const [allowGroup, setAllowGroup] = useState<string | undefined>(undefined);
  const [testMemberId, setTestMemberId] = useState("");
  const [plan, setPlan] = useState<DoorPlan | null>(null);

  const [updateDevice, { isLoading: isSaving }] = useUpdateAccessDeviceMutation();
  const [loadPlan, { isFetching: isPlanning }] = useLazyGetDoorPlanQuery();
  const [syncDoor, { isLoading: isApplying }] = useSyncDoorAccessMutation();
  const [testUser, { isLoading: isTestingUser }] = useTestDoorUserMutation();
  const [release, { isLoading: isReleasing }] = useReleaseEveryoneMutation();

  const blockValue = blockGroup ?? (device.blockGroup ?? "").toString();
  const allowValue = allowGroup ?? String(device.allowGroup ?? 1);
  const busy = isSaving || isPlanning || isApplying || isTestingUser || isReleasing;

  const attempt = async (action: () => Promise<unknown>, success?: string) => {
    try {
      await action();
      if (success) toast.success(success);
    } catch (error) {
      toast.error(errorText(error));
    }
  };

  const parseGroup = (value: string) => {
    const parsed = Number(value);
    if (value.trim() === "" || !Number.isInteger(parsed) || parsed < 0 || parsed > 255) {
      throw new Error("Group must be a whole number from 0 to 255");
    }
    return parsed;
  };

  const saveGroups = () =>
    attempt(async () => {
      await updateDevice({
        branchId,
        deviceId: device._id,
        blockGroup: parseGroup(blockValue),
        allowGroup: parseGroup(allowValue),
      }).unwrap();
      setBlockGroup(undefined);
      setAllowGroup(undefined);
    }, "Groups saved");

  const toggleWrites = () =>
    attempt(
      () =>
        updateDevice({
          branchId,
          deviceId: device._id,
          writeEnabled: !device.writeEnabled,
        }).unwrap(),
      device.writeEnabled ? "Door changes switched off" : "Door changes switched on",
    );

  const runTest = (state: "blocked" | "allowed", success: string) =>
    attempt(async () => {
      await testUser({
        branchId,
        deviceId: device._id,
        memberId: testMemberId.trim(),
        state,
      }).unwrap();
    }, success);

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-semibold text-purple hover:underline"
      >
        {open ? "Hide door changes" : "Door changes (advanced)"}
      </button>

      {open && (
        <div className="mt-2 space-y-3 rounded-md bg-gray-primary p-3">
          <p className="text-xs text-gray-600">
            To block a member the system moves them to a &quot;blocked&quot; group on the
            device. That group must first be set up on the device itself with no
            access time (Access Control menu), then confirmed with the test below.
            Staff, device admins and unknown IDs are never changed. Fingerprints
            and cards are never touched.
          </p>

          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs text-gray-600">
              Blocked group
              <Input
                type="number"
                min="0"
                max="255"
                value={blockValue}
                onChange={(e) => setBlockGroup(e.target.value)}
                className="mt-1 w-24"
              />
            </label>
            <label className="text-xs text-gray-600">
              Normal group
              <Input
                type="number"
                min="0"
                max="255"
                value={allowValue}
                onChange={(e) => setAllowGroup(e.target.value)}
                className="mt-1 w-24"
              />
            </label>
            <Button
              variant="outline"
              onClick={saveGroups}
              disabled={busy || (blockGroup === undefined && allowGroup === undefined)}
            >
              Save groups
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={device.writeEnabled ? "outline" : "default"}
              onClick={toggleWrites}
              disabled={busy || (!device.writeEnabled && device.blockGroup == null)}
            >
              {device.writeEnabled ? "Switch off door changes" : "Allow door changes"}
            </Button>
            <span className="text-xs text-gray-500">
              {device.writeEnabled
                ? doorControlOn
                  ? "On: the system keeps the device list up to date."
                  : "On, but door control is off, so nothing is changed."
                : "Off: the device is never changed."}
            </span>
          </div>

          <div className="space-y-2 rounded-md bg-white p-3">
            <p className="text-xs font-semibold text-gray-700">
              Test on one member (do this first)
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                placeholder="Member ID, e.g. 0014"
                value={testMemberId}
                onChange={(e) => setTestMemberId(e.target.value)}
                className="w-44"
              />
              <Button
                variant="outline"
                disabled={busy || !testMemberId.trim() || !device.writeEnabled}
                onClick={() =>
                  runTest(
                    "blocked",
                    "Member moved to the blocked group. Ask them to scan: the door should stay shut.",
                  )
                }
              >
                Block
              </Button>
              <Button
                variant="outline"
                disabled={busy || !testMemberId.trim() || !device.writeEnabled}
                onClick={() =>
                  runTest(
                    "allowed",
                    "Member moved back to the normal group. The door should open.",
                  )
                }
              >
                Allow
              </Button>
            </div>
            <p className="text-[11px] text-gray-500">
              Use a member who is standing at the door. Keep door control off
              while testing, otherwise the next automatic check may undo it.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={busy}
              onClick={() =>
                attempt(async () => {
                  setPlan(await loadPlan({ branchId, deviceId: device._id }).unwrap());
                })
              }
            >
              {isPlanning ? "Checking..." : "Preview changes"}
            </Button>
            <Button
              disabled={busy || !device.writeEnabled || !doorControlOn}
              onClick={() =>
                attempt(async () => {
                  setPlan(await syncDoor({ branchId, deviceId: device._id }).unwrap());
                }, "Device updated")
              }
            >
              {isApplying ? "Applying..." : "Apply now"}
            </Button>
            <Button
              variant="outline"
              disabled={busy || !device.writeEnabled}
              onClick={() =>
                attempt(async () => {
                  setPlan(await release({ branchId, deviceId: device._id }).unwrap());
                }, "Everyone is allowed in again")
              }
            >
              Allow everyone
            </Button>
          </div>

          {device.lastAccessSyncSummary ? (
            <p className="text-xs text-gray-500">
              Last update: {formatSeen(device.lastAccessSyncAt ?? null)} · {device.lastAccessSyncSummary}
            </p>
          ) : null}

          {plan && (
            <div className="rounded-md bg-white p-3 text-xs text-gray-700">
              <p className="font-semibold">
                {plan.dryRun ? "Preview" : "Result"}: {plan.summary}
              </p>
              {plan.blockedFromWriting.length > 0 && (
                <p className="mt-1 text-amber-700">
                  Not applied: {plan.blockedFromWriting.join("; ")}
                </p>
              )}
              {!plan.safety.ok && (
                <p className="mt-1 text-red-600">
                  Safety stop: {plan.safety.toBlock} blocks in one run is more than the
                  limit of {plan.safety.limit}.
                </p>
              )}
              {plan.changes.length > 0 && (
                <ul className="mt-2 max-h-40 list-disc space-y-0.5 overflow-auto pl-4">
                  {plan.changes.map((change) => (
                    <li key={change.userId}>
                      Device ID {change.userId}:{" "}
                      {change.to === "blocked" ? "block" : "allow"} (
                      {change.reason.replace(/_/g, " ")})
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const AccessControlSetup = () => {
  const { activeBranchId, isOwner } = useUser();
  const [graceDraft, setGraceDraft] = useState<string | undefined>(undefined);
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [deviceDraft, setDeviceDraft] = useState({ name: "", host: "", port: "" });

  const queryArg = activeBranchId ? { branchId: activeBranchId } : skipToken;
  const settingsQuery = useGetAccessSettingsQuery(queryArg);
  const devicesQuery = useGetAccessDevicesQuery(queryArg);

  const [updateSettings, { isLoading: isSaving }] =
    useUpdateAccessSettingsMutation();
  const [createDevice, { isLoading: isCreating }] =
    useCreateAccessDeviceMutation();
  const [testDevice, { isLoading: isTesting }] = useTestAccessDeviceMutation();
  const [syncDevice, { isLoading: isSyncing }] = useSyncAccessDeviceMutation();

  const settings = settingsQuery.data;
  const graceValue = graceDraft ?? String(settings?.graceDays ?? 5);
  const graceChanged =
    graceDraft !== undefined && Number(graceDraft) !== settings?.graceDays;

  const run = async (action: () => Promise<unknown>, success: string) => {
    try {
      await action();
      toast.success(success);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : extractApiErrorMessage(error),
      );
    }
  };

  const saveGrace = () => {
    const parsed = Number(graceValue);
    if (
      graceValue.trim() === "" ||
      !Number.isInteger(parsed) ||
      parsed < 0 ||
      parsed > MAX_GRACE_DAYS
    ) {
      toast.error(`Grace days must be a whole number from 0 to ${MAX_GRACE_DAYS}`);
      return;
    }

    return run(async () => {
      await updateSettings({ branchId: activeBranchId!, graceDays: parsed }).unwrap();
      setGraceDraft(undefined);
    }, "Grace days updated");
  };

  const toggleEnabled = () =>
    run(
      () =>
        updateSettings({
          branchId: activeBranchId!,
          enabled: !settings?.enabled,
        }).unwrap(),
      settings?.enabled
        ? "Door control switched off (scans are still recorded)"
        : "Door control switched on",
    );

  const addDevice = () => {
    const port = Number(deviceDraft.port);
    if (!deviceDraft.name.trim() || !deviceDraft.host.trim() || !Number.isInteger(port)) {
      toast.error("Enter a name, host and port");
      return;
    }

    return run(async () => {
      await createDevice({
        branchId: activeBranchId!,
        name: deviceDraft.name.trim(),
        host: deviceDraft.host.trim(),
        port,
      }).unwrap();
      setDeviceDraft({ name: "", host: "", port: "" });
      setShowAddDevice(false);
    }, "Device added");
  };

  if (settingsQuery.isLoading) {
    return (
      <Card className="h-full p-5 shadow-none border-none space-y-4">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-40 rounded-xl" />
      </Card>
    );
  }

  if (!activeBranchId) {
    return (
      <Card className="h-full p-5 shadow-none border-none">
        <h2 className="text-lg font-semibold text-gray-900">Door Access</h2>
        <p className="text-sm text-gray-600">
          Select a branch to manage door access and attendance.
        </p>
      </Card>
    );
  }

  return (
    <Card className="h-full p-5 shadow-none border-none">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          Door Access &amp; Attendance
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Scans from the door device are always recorded. When door control is on,
          members with an unpaid monthly fee are blocked after the grace period.
          Admission and package dues never block the door.
        </p>
      </div>

      <div className="space-y-3 bg-gray-primary p-3 rounded-md">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-gray-700 font-medium">Door control</h3>
            <p className="text-xs text-gray-500">
              {settings?.enabled
                ? "On: unpaid members are blocked after the grace period."
                : "Off: the door is not touched. Attendance is still recorded."}
            </p>
          </div>
          <Button
            variant={settings?.enabled ? "outline" : "default"}
            onClick={toggleEnabled}
            disabled={!isOwner || isSaving}
          >
            {settings?.enabled ? "Switch off" : "Switch on"}
          </Button>
        </div>

        <div className="flex items-center justify-between gap-2 bg-white px-3 py-2 rounded font-semibold text-text-primary">
          <div>
            <p className="text-sm">Grace days</p>
            <p className="text-xs font-normal text-gray-500">
              Days after the month starts before an unpaid member is blocked.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="0"
              max={MAX_GRACE_DAYS}
              step="1"
              value={graceValue}
              onChange={(event) => setGraceDraft(event.target.value)}
              className="w-24 text-right"
              disabled={!isOwner || isSaving}
            />
            {isOwner ? (
              <Button onClick={saveGrace} disabled={!graceChanged || isSaving}>
                {isSaving ? "Saving..." : "Save"}
              </Button>
            ) : null}
          </div>
        </div>
        <p className="text-xs text-gray-500">
          {isOwner
            ? "Branch level setting. Only the owner can change it."
            : "Read only. Only the owner can change these settings."}
        </p>
      </div>

      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-gray-700 font-medium">Devices</h3>
          {isOwner ? (
            <Button variant="outline" onClick={() => setShowAddDevice((v) => !v)}>
              {showAddDevice ? "Cancel" : "Add device"}
            </Button>
          ) : null}
        </div>

        {showAddDevice && (
          <div className="grid grid-cols-1 gap-2 rounded-md bg-gray-primary p-3 sm:grid-cols-4">
            <Input
              placeholder="Name"
              value={deviceDraft.name}
              onChange={(e) => setDeviceDraft({ ...deviceDraft, name: e.target.value })}
            />
            <Input
              placeholder="Host / IP"
              value={deviceDraft.host}
              onChange={(e) => setDeviceDraft({ ...deviceDraft, host: e.target.value })}
            />
            <Input
              placeholder="Port"
              type="number"
              value={deviceDraft.port}
              onChange={(e) => setDeviceDraft({ ...deviceDraft, port: e.target.value })}
            />
            <Button onClick={addDevice} disabled={isCreating}>
              {isCreating ? "Adding..." : "Add"}
            </Button>
          </div>
        )}

        {devicesQuery.data?.length === 0 && (
          <p className="text-sm text-gray-500">No device added for this branch yet.</p>
        )}

        {devicesQuery.data?.map((device) => (
          <div
            key={device._id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-gray-200 p-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900">
                {device.name}
                {device.deviceModel ? ` · ${device.deviceModel}` : ""}
              </p>
              <p className="text-xs text-gray-500">
                {device.host}:{device.port} · last contact {formatSeen(device.lastSeenAt)}
              </p>
              {device.lastError ? (
                <p className="text-xs text-red-600 break-words">
                  Last error: {device.lastError}
                </p>
              ) : null}
            </div>
            {isOwner ? (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={isTesting}
                  onClick={() =>
                    run(async () => {
                      const result = await testDevice({
                        branchId: activeBranchId,
                        deviceId: device._id,
                      }).unwrap();
                      if (!result.ok) throw new Error(result.error || "Device not reachable");
                    }, "Device is reachable")
                  }
                >
                  Test
                </Button>
                <Button
                  variant="outline"
                  disabled={isSyncing}
                  onClick={() =>
                    run(async () => {
                      const result = await syncDevice({
                        branchId: activeBranchId,
                        deviceId: device._id,
                      }).unwrap();
                      toast.info(`${result.inserted} new scans saved`);
                    }, "Scans synced")
                  }
                >
                  Sync now
                </Button>
              </div>
            ) : null}
            {isOwner ? (
              <DoorChangesPanel
                branchId={activeBranchId}
                device={device}
                doorControlOn={settings?.enabled === true}
              />
            ) : null}
          </div>
        ))}
      </div>
    </Card>
  );
};
