import React from 'react'

import { withStyles } from '@material-ui/core/styles';

import MuiAlert from '@material-ui/lab/Alert';

const styles = theme => (
    {
        notifications:
        {
            position: "absolute",
            left: theme.spacing(-2),
            top: theme.spacing(2),
            zIndex: 100,
        },
        hoverButtonInfo:
        {
            backgroundColor: theme.palette.primary.dark + "F0",
            margin: theme.spacing(1),
            fontWeight: "bold",
            borderRadius: theme.spacing(1),
        },
    }
);

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
        <div className={props.classes.notifications}>
            {elements.map(el =>
                <Alert
                    key={"vid-a-" + el.id}
                    severity={el.severity}
                    className={el.severity === "info" ? props.classes.hoverButtonInfo : props.classes.hoverButtonWarning}
                >
                    {el.text}
                </Alert>)
            }
        </div>
    );
}

export default withStyles(styles)(Notifications);