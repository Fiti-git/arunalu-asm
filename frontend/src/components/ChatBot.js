import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Fab,
  Paper,
  IconButton,
  TextField,
  Typography,
  CircularProgress,
  Stack,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import ChatIcon from "@mui/icons-material/Chat";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import PersonIcon from "@mui/icons-material/Person";
import api from "../utils/api";
import { isAuthenticated } from "../utils/auth";

const SUGGESTIONS = {
  auto: ["Who is absent today?", "Show pending leave requests", "Summary for today"],
  en: ["Who is absent today?", "Show pending leave requests", "Summary for today"],
  si: ["අද කවුද නැත්තේ?", "අනුමත වීමට ඇති නිවාඩු පෙන්වන්න", "අද සාරාංශය"],
  ta: ["இன்று யார் வரவில்லை?", "நிலுவையிலுள்ள விடுப்பு கோரிக்கைகள்", "இன்றைய சுருக்கம்"],
};

const LANG_LABEL = { auto: "Auto", en: "EN", si: "සි", ta: "த" };
const LANG_STORAGE_KEY = "chatbot_language";

function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi! I'm your ASM assistant. Ask me about attendance, leaves, or outlet stats.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState(
    () => localStorage.getItem(LANG_STORAGE_KEY) || "auto"
  );
  const scrollRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(LANG_STORAGE_KEY, language);
  }, [language]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading, open]);

  if (!isAuthenticated()) return null;

  const send = async (text) => {
    const question = (text ?? input).trim();
    if (!question || loading) return;
    setMessages((m) => [...m, { role: "user", content: question }]);
    setInput("");
    setLoading(true);
    try {
      const res = await api.post("/api/chatbot/ask/", { question, language });
      const answer =
        res.data?.answer || "I didn't get a response. Try rephrasing.";
      setMessages((m) => [
        ...m,
        { role: "assistant", content: answer, meta: res.data },
      ]);
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        "Sorry — the assistant is unavailable right now.";
      setMessages((m) => [...m, { role: "assistant", content: msg, error: true }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      {!open && (
        <Tooltip title="Ask the assistant" placement="left">
          <Fab
            color="primary"
            onClick={() => setOpen(true)}
            sx={{
              position: "fixed",
              bottom: 24,
              right: 24,
              zIndex: 1300,
            }}
          >
            <ChatIcon />
          </Fab>
        </Tooltip>
      )}

      {open && (
        <Paper
          elevation={8}
          sx={{
            position: "fixed",
            bottom: 24,
            right: 24,
            width: { xs: "calc(100vw - 32px)", sm: 380 },
            height: { xs: "70vh", sm: 540 },
            zIndex: 1300,
            display: "flex",
            flexDirection: "column",
            borderRadius: 3,
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              p: 1.5,
              bgcolor: "primary.main",
              color: "primary.contrastText",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <SmartToyIcon fontSize="small" />
              <Typography variant="subtitle2" fontWeight={600}>
                ASM Assistant
              </Typography>
            </Stack>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <ToggleButtonGroup
                value={language}
                exclusive
                size="small"
                onChange={(_, v) => v && setLanguage(v)}
                sx={{
                  bgcolor: "rgba(255,255,255,0.15)",
                  "& .MuiToggleButton-root": {
                    color: "inherit",
                    border: "none",
                    px: 0.8,
                    py: 0.2,
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: "none",
                  },
                  "& .Mui-selected": {
                    bgcolor: "rgba(255,255,255,0.35) !important",
                    color: "inherit !important",
                  },
                }}
              >
                {Object.keys(LANG_LABEL).map((k) => (
                  <ToggleButton key={k} value={k}>
                    {LANG_LABEL[k]}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
              <IconButton
                size="small"
                onClick={() => setOpen(false)}
                sx={{ color: "inherit" }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Box>

          <Box
            ref={scrollRef}
            sx={{
              flex: 1,
              overflowY: "auto",
              p: 1.5,
              bgcolor: "grey.50",
            }}
          >
            {messages.map((m, i) => (
              <MessageBubble key={i} message={m} />
            ))}
            {loading && (
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                <CircularProgress size={14} />
                <Typography variant="caption" color="text.secondary">
                  thinking…
                </Typography>
              </Stack>
            )}
          </Box>

          {messages.length <= 1 && (
            <Stack direction="row" spacing={1} sx={{ p: 1, flexWrap: "wrap" }}>
              {(SUGGESTIONS[language] || SUGGESTIONS.auto).map((s) => (
                <Box
                  key={s}
                  onClick={() => send(s)}
                  sx={{
                    fontSize: 12,
                    px: 1.2,
                    py: 0.5,
                    mb: 0.5,
                    bgcolor: "primary.50",
                    color: "primary.main",
                    borderRadius: 2,
                    cursor: "pointer",
                    border: "1px solid",
                    borderColor: "primary.100",
                    "&:hover": { bgcolor: "primary.100" },
                  }}
                >
                  {s}
                </Box>
              ))}
            </Stack>
          )}

          <Box sx={{ p: 1, borderTop: "1px solid", borderColor: "divider" }}>
            <Stack direction="row" spacing={1} alignItems="flex-end">
              <TextField
                fullWidth
                size="small"
                multiline
                maxRows={3}
                placeholder="Ask anything…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                disabled={loading}
              />
              <IconButton
                color="primary"
                onClick={() => send()}
                disabled={loading || !input.trim()}
              >
                <SendIcon />
              </IconButton>
            </Stack>
          </Box>
        </Paper>
      )}
    </>
  );
}

function MessageBubble({ message }) {
  const isUser = message.role === "user";
  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{
        mb: 1.2,
        flexDirection: isUser ? "row-reverse" : "row",
        alignItems: "flex-start",
      }}
    >
      <Box
        sx={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          bgcolor: isUser ? "primary.main" : "grey.300",
          color: isUser ? "primary.contrastText" : "text.primary",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {isUser ? <PersonIcon fontSize="small" /> : <SmartToyIcon fontSize="small" />}
      </Box>
      <Box
        sx={{
          maxWidth: "78%",
          px: 1.5,
          py: 1,
          borderRadius: 2,
          bgcolor: message.error
            ? "error.50"
            : isUser
            ? "primary.main"
            : "background.paper",
          color: message.error
            ? "error.dark"
            : isUser
            ? "primary.contrastText"
            : "text.primary",
          border: !isUser && !message.error ? "1px solid" : "none",
          borderColor: "divider",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          fontSize: 14,
          lineHeight: 1.5,
        }}
      >
        {message.content}
      </Box>
    </Stack>
  );
}

export default ChatBot;
