import { useEffect, useState } from "react";
import {
  Archive,
  BadgeCheck,
  BellRing,
  Inbox,
  MailOpen,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  getVisibleMessages,
  ionosConnectionPresets,
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

const MailReader = () => {
  const [selectedFolder, setSelectedFolder] = useState<MailFolderId>("inbox");
  const [searchQuery, setSearchQuery] = useState("");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState(sampleMessages[0]?.id ?? "");
  const [accountEmail, setAccountEmail] = useState("you@yourdomain.com");
  const [displayName, setDisplayName] = useState("Primary mailbox");

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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(18,152,117,0.18),_transparent_32%),linear-gradient(180deg,_hsl(var(--background))_0%,_hsl(46_40%_96%)_100%)]">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 grid gap-4 lg:grid-cols-[1.4fr_0.9fr]">
          <Card className="border-white/70 bg-white/85 backdrop-blur">
            <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-3">
                <Badge variant="secondary" className="w-fit bg-emerald-100 text-emerald-900">
                  IONOS mail reader concept
                </Badge>
                <div className="space-y-2">
                  <CardTitle className="text-3xl font-semibold tracking-tight text-slate-900">
                    Read mail faster without living in webmail
                  </CardTitle>
                  <CardDescription className="max-w-2xl text-base text-slate-600">
                    This interface is tuned for scanning, filtering, and opening messages from an IONOS-hosted
                    mailbox. It keeps the reading flow front and center and leaves sending for later.
                  </CardDescription>
                </div>
              </div>
              <div className="grid gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-950">
                <div className="flex items-center gap-2 font-medium">
                  <ShieldCheck className="h-4 w-4" />
                  Ready for secure mailbox settings
                </div>
                <p className="text-emerald-800">
                  The page includes IONOS IMAP and SMTP presets so we can plug in a real sync layer next.
                </p>
              </div>
            </CardHeader>
          </Card>

          <Card className="border-slate-200 bg-slate-950 text-slate-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Sparkles className="h-5 w-5 text-amber-300" />
                Connection snapshot
              </CardTitle>
              <CardDescription className="text-slate-300">
                Preset values for wiring this reader to an IONOS mailbox backend.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-400">IMAP</p>
                <p>{ionosConnectionPresets.imap.host}</p>
                <p className="text-slate-300">Port {ionosConnectionPresets.imap.port} with {ionosConnectionPresets.imap.security}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-400">SMTP</p>
                <p>{ionosConnectionPresets.smtp.host}</p>
                <p className="text-slate-300">Port {ionosConnectionPresets.smtp.port} with {ionosConnectionPresets.smtp.security}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid flex-1 gap-4 xl:grid-cols-[280px_minmax(320px,420px)_minmax(0,1fr)]">
          <Card className="border-white/70 bg-white/80 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-xl text-slate-900">Mailbox</CardTitle>
              <CardDescription>Set the identity and review the folders your reader cares about most.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="display-name">
                    Mailbox label
                  </label>
                  <Input id="display-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="account-email">
                    Email address
                  </label>
                  <Input id="account-email" value={accountEmail} onChange={(event) => setAccountEmail(event.target.value)} />
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Folders</p>
                <div className="mt-3 space-y-2">
                  {mailFolders.map((folder) => {
                    const Icon = folderIcons[folder.id];

                    return (
                      <button
                        key={folder.id}
                        type="button"
                        onClick={() => setSelectedFolder(folder.id)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-xl px-3 py-3 text-left transition",
                          selectedFolder === folder.id
                            ? "bg-emerald-600 text-white shadow-sm"
                            : "bg-white text-slate-700 hover:bg-emerald-50",
                        )}
                      >
                        <span className="flex items-center gap-3">
                          <Icon className="h-4 w-4" />
                          <span className="font-medium">{folder.label}</span>
                        </span>
                        <Badge
                          variant={selectedFolder === folder.id ? "secondary" : "outline"}
                          className={selectedFolder === folder.id ? "bg-white/15 text-white" : ""}
                        >
                          {folder.count}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                <div className="mb-1 flex items-center gap-2 font-medium">
                  <BadgeCheck className="h-4 w-4" />
                  Reading-first scope
                </div>
                <p className="text-amber-900">
                  This version focuses on searching and reading messages. Compose and reply can stay inside IONOS
                  webmail until we add a sending workflow.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/70 bg-white/85 backdrop-blur">
            <CardHeader className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-xl text-slate-900">{displayName}</CardTitle>
                  <CardDescription>{accountEmail}</CardDescription>
                </div>
                <Button variant="outline" size="sm" className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </Button>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search sender, subject, or tag"
                    className="pl-9"
                  />
                </div>
                <Button
                  variant={showUnreadOnly ? "default" : "outline"}
                  size="sm"
                  className="w-full"
                  onClick={() => setShowUnreadOnly((current) => !current)}
                >
                  <MailOpen className="h-4 w-4" />
                  {showUnreadOnly ? "Showing unread only" : "Include read messages"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="h-[560px] pt-0">
              <ScrollArea className="h-full pr-3">
                <div className="space-y-3">
                  {visibleMessages.length ? (
                    visibleMessages.map((message) => (
                      <MessageListItem
                        key={message.id}
                        message={message}
                        isSelected={message.id === selectedMessage?.id}
                        onSelect={() => setSelectedMessageId(message.id)}
                      />
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                      <p className="font-medium text-slate-900">{emptyCopy[selectedFolder].title}</p>
                      <p className="mt-2 text-sm text-slate-600">{emptyCopy[selectedFolder].detail}</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="border-white/70 bg-white/90 backdrop-blur">
            <CardHeader className="border-b border-slate-100">
              {selectedMessage ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedMessage.unread ? <Badge>Unread</Badge> : <Badge variant="secondary">Read</Badge>}
                    {selectedMessage.important ? <Badge variant="outline">Important</Badge> : null}
                    {selectedMessage.starred ? <Badge variant="outline">Starred</Badge> : null}
                  </div>
                  <CardTitle className="text-2xl text-slate-950">{selectedMessage.subject}</CardTitle>
                  <CardDescription className="text-base">
                    From {selectedMessage.from} &lt;{selectedMessage.fromAddress}&gt; • {selectedMessage.receivedAt}
                  </CardDescription>
                </>
              ) : (
                <>
                  <CardTitle className="text-2xl text-slate-950">Choose a message</CardTitle>
                  <CardDescription>The reading pane will open the first result that matches your filters.</CardDescription>
                </>
              )}
            </CardHeader>
            <CardContent className="flex h-[560px] flex-col">
              {selectedMessage ? (
                <>
                  <ScrollArea className="flex-1 pr-4">
                    <div className="space-y-4 py-1 text-[15px] leading-7 text-slate-700">
                      {selectedMessage.body.map((paragraph) => (
                        <p key={paragraph}>{paragraph}</p>
                      ))}
                    </div>
                  </ScrollArea>
                  <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                    {selectedMessage.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="bg-slate-100 text-slate-700">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center text-slate-500">
                  Nothing to display yet.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

type MessageListItemProps = {
  message: MailMessage;
  isSelected: boolean;
  onSelect: () => void;
};

const MessageListItem = ({ message, isSelected, onSelect }: MessageListItemProps) => (
  <button
    type="button"
    onClick={onSelect}
    className={cn(
      "w-full rounded-2xl border p-4 text-left transition",
      isSelected
        ? "border-emerald-300 bg-emerald-50 shadow-sm"
        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
    )}
  >
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate font-semibold text-slate-900">{message.from}</p>
          {message.unread ? <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" aria-hidden /> : null}
        </div>
        <p className="mt-1 truncate text-sm font-medium text-slate-700">{message.subject}</p>
      </div>
      <span className="shrink-0 text-xs text-slate-500">{message.receivedAt}</span>
    </div>
    <p className="mt-2 line-clamp-2 text-sm text-slate-600">{message.preview}</p>
  </button>
);

export default MailReader;
