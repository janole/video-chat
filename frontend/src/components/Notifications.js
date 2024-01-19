import { Box, alpha } from '@mui/material';
import MuiAlert from '@mui/lab/Alert';

const sx =
{
    notifications:
    {
        position: "absolute",
        left: -2,
        top: 2,
        zIndex: 100,
    },
    hoverButtonInfo:
    {
        backgroundColor: theme => alpha(theme.palette.primary.dark, 0.8),
        margin: 1,
        fontWeight: "bold",
        borderRadius: 1,
    },
    hoverButtonWarning:
    {
        backgroundColor: theme => alpha(theme.palette.warning.dark, 0.8),
        margin: 1,
        fontWeight: "bold",
        borderRadius: 1,
    },
};

function Alert(props)
{
    return <MuiAlert elevation={6} variant="filled" {...props} />;
}

function Notifications(props)
{
    const elements = [];

    if (!props.connected)
    {
        elements.push({ id: 1, severity: "info", text: "Connecting ..." });
    }
    else if (!props.active)
    {
        elements.push({ id: 1, severity: "info", text: "Waiting for somebody to join ..." });
    }

    // more notifications to come ... or not!? ... who knows ...

    if (elements.length === 0)
    {
        return null;
    }

    return (
        <Box sx={sx.notifications}>
            {elements.map(el =>
                <Alert
                    key={"vid-a-" + el.id}
                    severity={el.severity}
                    sx={el.severity === "info" ? sx.hoverButtonInfo : sx.hoverButtonWarning}
                >
                    {el.text}
                </Alert>)
            }
        </Box>
    );
}

export default Notifications;