import React, { useState } from 'react';

import { makeStyles } from '@material-ui/core/styles';
import { Container, Box, Card, CardContent, Typography, TextField, CardActions, Button, CardHeader, } from '@material-ui/core';
import ContactPhoneIcon from '@material-ui/icons/ContactPhone';
import GitHubIcon from '@material-ui/icons/GitHub';

const homeStyles = makeStyles(theme =>
    ({
        background:
        {
            position: "fixed",
            left: 0, right: 0, top: 0, bottom: 0,
            backgroundImage: "linear-gradient(to bottom, #FFF 10%, #F0F0FFFF 15%, #F0F0FFFF 80%, #FFF 90%)",
            backgroundSize: "cover",
            backgroundPosition: "50% 75%",
            width: "100%",
            height: "100vh",
            zIndex: -2,
        },
        bgvideo:
        {
            position: "fixed",
            left: 0, right: 0, top: "15%", bottom: "80%",
            width: "100%",
            height: "65%",
            zIndex: -1,
            "& video":
            {
                width: "100%",
                height: "100%",
                objectFit: "cover",
            },
        },
        box:
        {
            paddingTop: "5%",
        },
        cardHeader:
        {
            background: 'linear-gradient(45deg, #CC88FF 20%, #223377 90%)',
            color: theme.palette.primary.contrastText,
            padding: theme.spacing(0.72),
        },
        footer:
        {
            position: "fixed",
            textAlign: "right",
            bottom: theme.spacing(1),
            left: theme.spacing(1),
            right: theme.spacing(1),
        }
    }));

function Home(props)
{
    const classes = homeStyles();

    const [code, setCode] = useState("");

    const startCall = () => 
    {
        props.history.push("/call/" + code);
    };

    return (
        <div>
            <Container maxWidth="sm">
                <Box mt={2} p={2} className={classes.box}>
                    <Card elevation={8}>
                        <CardHeader className={classes.cardHeader}></CardHeader>
                        <CardContent>
                            <Typography variant="h4" component="h4" color="textPrimary" gutterBottom style={{ fontWeight: 900 }}>
                                Simple Video-Chat Demo
                            </Typography>

                            <Box fontSize="subtitle1.fontSize" lineHeight={1.5} component="p" color="text.primary" mt={2} mb={3}>
                                Please enter a Room ID to join a video chat ...
                            </Box>

                            <form noValidate autoComplete="off" onSubmit={startCall}>
                                <TextField fullWidth={true} id="code" label="Room ID" variant="outlined" value={code} onChange={e => setCode(e.target.value)} />
                            </form>

                        </CardContent>

                        <CardActions>
                            <Button size="large" color="primary" disabled={code.trim().length === 0} startIcon={<ContactPhoneIcon />} onClick={startCall}>Start video chat</Button>
                        </CardActions>
                    </Card>
                </Box>
            </Container>

            <div className={classes.bgvideo}>
                <video loop muted autoPlay playsInline disablePictureInPicture>
                    <source src="background.mp4" type="video/mp4" />
                </video>
            </div>

            <div className={classes.background} />

            <div className={classes.footer}>
                <Button startIcon={<GitHubIcon />}>github</Button>
            </div>
        </div>
    );
}

export default Home;