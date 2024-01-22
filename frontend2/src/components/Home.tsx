import { useState } from 'react';

import { useNavigate } from 'react-router-dom';
import { Container, Box, Card, CardContent, Typography, TextField, CardActions, Button, CardHeader, Theme } from '@mui/material';
import { ContactPhone, GitHub } from '@mui/icons-material';

import { version as PACKAGE_VERSION } from "../../../package.json";

const sxHome =
{
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
        color: (theme: Theme) => theme.palette.primary.contrastText,
        padding: 0.72,
    },
    footer:
    {
        position: "fixed",
        textAlign: "right",
        bottom: 1,
        left: 1,
        right: 1,
    },
}

function Home()
{
    const navigate = useNavigate();

    const [code, setCode] = useState("");

    const startCall = () => 
    {
        navigate("/call/" + code);
    };

    return (
        <Box>
            <Container maxWidth="sm">
                <Box mt={2} p={2} sx={sxHome.box}>
                    <Card elevation={8}>
                        <CardHeader sx={sxHome.cardHeader}></CardHeader>
                        <CardContent>
                            <Typography variant="h4" component="h4" color="textPrimary" gutterBottom style={{ fontWeight: 700 }}>
                                Simple Video-Chat Demo
                            </Typography>

                            <Box fontSize="subtitle1.fontSize" lineHeight={1.5} color="text.primary" mt={2} mb={3}>
                                Please enter a Room ID to join a video chat ...
                            </Box>

                            <form noValidate autoComplete="off" onSubmit={startCall}>
                                <TextField fullWidth={true} id="code" label="Room ID" variant="outlined" value={code} onChange={e => setCode(e.target.value)} />
                            </form>

                        </CardContent>

                        <CardActions>
                            <Button size="large" color="primary" disabled={code.trim().length === 0} startIcon={<ContactPhone />} onClick={startCall}>Start video chat</Button>
                        </CardActions>
                    </Card>
                </Box>
            </Container>

            <Box sx={sxHome.bgvideo}>
                <video loop muted autoPlay playsInline disablePictureInPicture>
                    <source src="background.mp4" type="video/mp4" />
                </video>
            </Box>

            <Box sx={sxHome.background} />

            <Box sx={sxHome.footer}>
                <Button color="inherit" startIcon={<GitHub />} href="https://github.com/janole/video-chat">github</Button>
                <Button disabled style={{ textTransform: "none" }}>v {import.meta.env.REACT_APP_VERSION || PACKAGE_VERSION}</Button>
            </Box>
        </Box>
    );
}

export default Home;