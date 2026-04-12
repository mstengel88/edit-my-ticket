import { useEffect, useState } from "react";
import {
  Archive,
  Bell,
  BellRing,
  ChevronDown,
  Circle,
  CircleHelp,
  Clock3,
  FileStack,
  Flag,
  Folder,
  Forward,
  Inbox,
  Mail,
  Menu,
  MessageSquareMore,
  Paperclip,
  Plus,
  Reply,
  ReplyAll,
  Search,
  Send,
  Settings,
  Shield,
  Sparkles,
  Star,
  Trash2,
  Users,
  RotateCw,
  CalendarDays,
  LogOut,
  MoreHorizontal,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  getVisibleMessages,
  mailFolders,
  sampleMessages,
  type MailFolderId,
  type MailMessage,
} from "./mailData";
import { cn } from "@/lib/utils";

const folderIcons = {
  inbox: Inbox,
  starred: Star,
  important: BellRing,
  archive: Archive,
};

const emptyCopy: Record<MailFolderId, { title: string; detail: string }> = {
  inbox: {
    title: "Inbox is clear",
    detail: "No matching mail landed in the inbox for this filter.",
  },
  starred: {
    title: "Nothing starred yet",
    detail: "Mark important threads with a star so they stay easy to revisit.",
  },
  important: {
    title: "No urgent mail",
    detail: "Important messages will appear here when a thread needs attention.",
  },
  archive: {
    title: "Archive is empty",
    detail: "Archived conversations will collect here once you start triaging mail.",
  },
};

const customFolders = [
  "App",
  "Deanna",
  "Done",
  "Farmtek",
  "Fiber",
  "Loadrite",
  "Menards",
  "Modern Retail",
  "Rapid POS",
  "Shopify",
  "Software",
];

const topNavIcons = [Mail, CalendarDays, Users, FileStack];
const actionIcons = [Sparkles, Trash2, Archive, Shield, Reply, ReplyAll, Forward, Flag, Folder, MoreHorizontal];
const utilityIcons = [CalendarDays, MessageSquareMore];
const systemFolders = [
  { id: "inbox" as const, label: "Inbox", count: 2 },
  { id: "drafts" as const, label: "Drafts" },
  { id: "sent" as const, label: "Sent" },
  { id: "spam" as const, label: "Spam" },
  { id: "trash" as const, label: "Trash", count: 1 },
];

const systemFolderIcons = {
  inbox: Inbox,
  drafts: FileStack,
  sent: Send,
  spam: Shield,
  trash: Trash2,
};

const MailReader = () => {
  const [selectedFolder, setSelectedFolder] = useState<MailFolderId>("inbox");
  const [searchQuery, setSearchQuery] = useState("");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState(sampleMessages[0]?.id ?? "");

  const visibleMessages = getVisibleMessages(sampleMessages, {
    folder: selectedFolder,
    query: searchQuery,
    unreadOnly: showUnreadOnly,
  });

  const selectedMessage =
    visibleMessages.find((message) => message.id === selectedMessageId) ?? visibleMessages[0] ?? null;

  useEffect(() => {
    if (!selectedMessage) {
      setSelectedMessageId("");
      return;
    }

    if (selectedMessage.id !== selectedMessageId) {
      setSelectedMessageId(selectedMessage.id);
    }
  }, [selectedMessage, selectedMessageId]);

  return (
    <div className="min-h-screen overflow-hidden bg-[#171717] text-[#d9d9d9]">
      <div className="flex min-h-screen flex-col">
        <header className="flex h-14 items-center gap-3 border-b border-white/5 bg-[#101010] px-4 text-sm">
          <div className="flex min-w-[180px] items-center gap-4">
            <div className="text-[22px] font-semibold tracking-[0.32em] text-white">IONOS</div>
            <Menu className="h-5 w-5 text-[#9b9b9b]" />
            {topNavIcons.map((Icon, index) => (
              <button
                key={index}
                type="button"
                className="hidden text-[#8f8f8f] transition hover:text-white md:flex"
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>

          <div className="mx-auto w-full max-w-xl">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b8b8b]" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search email"
                className="h-10 border-white/5 bg-[#252525] pl-12 text-[#f0f0f0] placeholder:text-[#8a8a8a] focus-visible:ring-[#444]"
              />
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#787878]" />
            </div>
          </div>

          <div className="flex items-center gap-4 text-[#9a9a9a]">
            <Bell className="h-4 w-4" />
            <Sparkles className="h-4 w-4 text-[#d06cff]" />
            <RotateCw className="h-4 w-4" />
            <CircleHelp className="h-4 w-4" />
            <Settings className="h-4 w-4" />
            <LogOut className="h-4 w-4" />
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2d2d2d] text-xs font-semibold text-[#c8c8c8]">
              MS
            </div>
          </div>
        </header>

        <div className="grid flex-1 overflow-hidden lg:grid-cols-[286px_minmax(0,1fr)_52px]">
          <aside className="flex h-full flex-col border-r border-white/5 bg-[#111111] px-3 py-4">
            <button
              type="button"
              className="mb-5 flex h-10 items-center justify-center rounded bg-[#b04e12] text-sm font-semibold text-white transition hover:bg-[#c85a15]"
            >
              New email
              <ChevronDown className="ml-2 h-4 w-4" />
            </button>

            <div className="mb-3 flex items-center gap-2 px-2 text-sm font-medium text-[#bebebe]">
              <ChevronDown className="h-4 w-4 text-[#767676]" />
              greenhillswi.com
            </div>

            <div className="space-y-1">
              {systemFolders.map((folder) => {
                const Icon = systemFolderIcons[folder.id];
                const isActive = folder.id === "inbox" && selectedFolder === "inbox";

                return (
                  <button
                    key={folder.id}
                    type="button"
                    onClick={() => {
                      if (folder.id === "inbox") setSelectedFolder("inbox");
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 rounded px-3 py-2 text-left text-sm transition",
                      isActive ? "bg-[#343434] text-white" : "text-[#9a9a9a] hover:bg-[#1f1f1f] hover:text-white",
                    )}
                  >
                    <Icon className="h-4 w-4 text-[#d17a46]" />
                    <span className="flex-1">{folder.label}</span>
                    <span className="text-xs text-[#c7c7c7]">{folder.count}</span>
                    {isActive ? <MoreHorizontal className="h-4 w-4 text-[#9d9d9d]" /> : null}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 flex items-center justify-between px-2 text-sm text-[#9d9d9d]">
              <div className="flex items-center gap-2">
                <ChevronDown className="h-4 w-4 text-[#767676]" />
                My folders
              </div>
              <Plus className="h-4 w-4" />
            </div>

            <ScrollArea className="mt-2 flex-1 pr-2">
              <div className="space-y-1 pb-4">
                {mailFolders
                  .filter((folder) => folder.id !== "inbox")
                  .map((folder) => {
                    const Icon = folderIcons[folder.id];
                    const isActive = selectedFolder === folder.id;

                    return (
                      <button
                        key={folder.id}
                        type="button"
                        onClick={() => setSelectedFolder(folder.id)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded px-3 py-2 text-left text-sm transition",
                          isActive ? "bg-[#2b2b2b] text-white" : "text-[#8f8f8f] hover:bg-[#1b1b1b] hover:text-white",
                        )}
                      >
                        <Icon className="h-4 w-4 text-[#d17a46]" />
                        <span className="flex-1">{folder.label}</span>
                        <span className="text-xs text-[#b0b0b0]">{folder.count}</span>
                      </button>
                    );
                  })}

                {customFolders.map((folder) => (
                  <button
                    key={folder}
                    type="button"
                    className="flex w-full items-center gap-3 rounded px-3 py-2 text-left text-sm text-[#8f8f8f] transition hover:bg-[#1b1b1b] hover:text-white"
                  >
                    <Folder className="h-4 w-4 text-[#d17a46]" />
                    <span>{folder}</span>
                  </button>
                ))}
              </div>
            </ScrollArea>

            <div className="mt-auto flex items-center justify-between pt-4 text-[#8b8b8b]">
              <button type="button" className="rounded p-1 transition hover:bg-[#1f1f1f] hover:text-white">
                <FileStack className="h-4 w-4" />
              </button>
              <button type="button" className="rounded p-1 transition hover:bg-[#1f1f1f] hover:text-white">
                <CircleHelp className="h-4 w-4" />
              </button>
            </div>

            <div className="pt-4 text-xs text-[#a6a6a6]">
              <div>Mail quota</div>
              <div className="mt-1 font-semibold text-[#dbdbdb]">77 MB of 2 GB used</div>
              <div className="mt-2 h-2 rounded-full bg-[#3a3a3a]">
                <div className="h-2 w-[9%] rounded-full bg-[#df6517]" />
              </div>
            </div>
          </aside>

          <main className="flex min-h-0 flex-col bg-[#1c1c1c]">
            <div className="flex items-center gap-2 px-6 py-4 text-[#919191]">
              {actionIcons.map((Icon, index) => (
                <button key={index} type="button" className="rounded p-2 transition hover:bg-[#2a2a2a] hover:text-white">
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>

            <div className="px-6 pb-3">
              <div className="text-[33px] font-semibold text-[#d7d7d7]">{capitalizeFolder(selectedFolder)}</div>
              <div className="mt-1 text-sm text-[#8a8a8a]">{visibleMessages.length} messages</div>
            </div>

            <div className="flex items-center justify-between px-6 pb-3">
              <div className="flex items-center gap-4 text-[#9f9f9f]">
                <Circle className="h-3.5 w-3.5 fill-[#ff9a63] text-[#ff9a63]" />
                <label className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={showUnreadOnly}
                    onChange={() => setShowUnreadOnly((current) => !current)}
                    className="h-4 w-4 rounded border-white/10 bg-transparent accent-[#d45f16]"
                  />
                  Unread only
                </label>
              </div>
              <button type="button" className="rounded p-2 text-[#8f8f8f] transition hover:bg-[#2a2a2a] hover:text-white">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 px-4 pb-0 sm:px-6">
              <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-t-md border border-white/5 border-b-0 bg-[#1f1f1f]">
                {visibleMessages.length ? (
                  <ScrollArea className="min-h-0 flex-1">
                    <div className="divide-y divide-white/10">
                      {visibleMessages.map((message) => (
                        <MessageRow
                          key={message.id}
                          message={message}
                          isSelected={message.id === selectedMessage?.id}
                          onSelect={() => setSelectedMessageId(message.id)}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-[#8d8d8d]">
                    <div>
                      <p className="text-base font-medium text-[#d0d0d0]">{emptyCopy[selectedFolder].title}</p>
                      <p className="mt-2">{emptyCopy[selectedFolder].detail}</p>
                    </div>
                  </div>
                )}
                <div className="border-t border-white/5 py-4 text-center text-sm text-[#9a9a9a]">Updated just now</div>
              </div>
            </div>
          </main>

          <aside className="hidden border-l border-white/5 bg-[#1b1b1b] py-4 lg:block">
            <div className="flex flex-col items-center gap-3">
              {utilityIcons.map((Icon, index) => (
                <button
                  key={index}
                  type="button"
                  className="rounded bg-[#252525] p-3 text-[#9b9b9b] transition hover:text-white"
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>

            <div className="absolute bottom-16 right-0">
              <div className="rounded-l bg-[#b04e12] px-2 py-10 text-xs font-semibold tracking-wide text-white [writing-mode:vertical-rl] [text-orientation:mixed]">
                Feedback
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

function capitalizeFolder(folder: MailFolderId) {
  return folder.charAt(0).toUpperCase() + folder.slice(1);
}

type MessageRowProps = {
  message: MailMessage;
  isSelected: boolean;
  onSelect: () => void;
};

const MessageRow = ({ message, isSelected, onSelect }: MessageRowProps) => (
  <button
    type="button"
    onClick={onSelect}
    className={cn(
      "grid w-full grid-cols-[34px_34px_minmax(120px,180px)_minmax(180px,1fr)_110px] items-center gap-0 px-2 py-3 text-left text-sm transition sm:grid-cols-[44px_44px_minmax(150px,200px)_minmax(200px,1fr)_120px]",
      isSelected ? "bg-[#cf5b15] text-white" : "bg-[#1f1f1f] text-[#bfbfbf] hover:bg-[#2a2a2a]",
    )}
  >
    <div className="flex items-center justify-center">
      {message.unread ? (
        <Circle className={cn("h-3 w-3 fill-[#ffa36e] text-[#ffa36e]", isSelected && "fill-white text-white")} />
      ) : (
        <span className="h-3 w-3" />
      )}
    </div>
    <div className="flex items-center justify-center">
      <span
        className={cn(
          "flex h-4 w-4 items-center justify-center rounded-[4px] border",
          isSelected ? "border-white/80 bg-white text-[#cf5b15]" : "border-[#9a9a9a]",
        )}
      >
        {isSelected ? <span className="h-1.5 w-1.5 rounded-full bg-current" /> : null}
      </span>
    </div>
    <div className="min-w-0">
      <p className={cn("truncate", isSelected ? "font-medium text-white" : message.unread ? "font-semibold text-[#d8d8d8]" : "font-medium text-[#bdbdbd]")}>
        {message.from}
      </p>
    </div>
    <div className="min-w-0 pr-4">
      <div className="flex items-center gap-3">
        {message.hasAttachment ? (
          <Paperclip className={cn("h-3.5 w-3.5 shrink-0", isSelected ? "text-white" : "text-[#8f8f8f]")} />
        ) : null}
        {message.starred && !isSelected ? <Star className="h-3.5 w-3.5 shrink-0 fill-[#ff9a63] text-[#ff9a63]" /> : null}
        <p className={cn("truncate", isSelected ? "text-white" : message.unread ? "font-semibold text-[#d7d7d7]" : "text-[#b9b9b9]")}>
          {message.subject}
        </p>
      </div>
    </div>
    <div className={cn("flex items-center justify-end gap-2 text-right text-xs", isSelected ? "text-white/95" : "text-[#979797]")}>
      {message.important && !isSelected ? <Clock3 className="h-3.5 w-3.5 text-[#9c9c9c]" /> : null}
      <span>{message.receivedAt}</span>
    </div>
  </button>
);

export default MailReader;
