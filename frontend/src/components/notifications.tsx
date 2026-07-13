import type { AlertProps, SxProps, Theme } from "@mui/material";
import { Alert as MuiAlert, alpha, Box } from "@mui/material";

interface NotificationsProps
{
    active: boolean;
    connected: boolean;
}

interface Notification
{
    id: number;
    severity: "info" | "warning";
    text: string;
}

const sx = {
    notifications: {
        position: "absolute",
        left: -2,
        top: 2,
        zIndex: 100,
    },
    hoverButtonInfo: {
        backgroundColor: (theme: Theme) => alpha(theme.palette.primary.dark, 0.8),
        margin: 1,
        fontWeight: "bold",
        borderRadius: 1,
    },
    hoverButtonWarning: {
        backgroundColor: (theme: Theme) => alpha(theme.palette.warning.dark, 0.8),
        margin: 1,
        fontWeight: "bold",
        borderRadius: 1,
    },
} satisfies Record<string, SxProps<Theme>>;

function Alert(props: AlertProps)
{
    return <MuiAlert elevation={6} variant="filled" {...props} />;
}

function Notifications({ active, connected }: NotificationsProps)
{
    const elements: Notification[] = [];

    if (!connected)
    {
        elements.push({ id: 1, severity: "info", text: "Connecting ..." });
    }
    else if (!active)
    {
        elements.push({ id: 1, severity: "info", text: "Waiting for somebody to join ..." });
    }

    if (elements.length === 0)
    {
        return null;
    }

    return (
        <Box sx={sx.notifications}>
            {elements.map((element) => (
                <Alert
                    key={`video-alert-${element.id}`}
                    severity={element.severity}
                    sx={element.severity === "info" ? sx.hoverButtonInfo : sx.hoverButtonWarning}
                >
                    {element.text}
                </Alert>
            ))}
        </Box>
    );
}

export default Notifications;
