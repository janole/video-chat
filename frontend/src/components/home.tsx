import ContactPhoneIcon from "@mui/icons-material/ContactPhone";
import GitHubIcon from "@mui/icons-material/GitHub";
import type { SxProps, Theme } from "@mui/material";
import { Box, Button, Card, CardActions, CardContent, CardHeader, Container, TextField, Typography } from "@mui/material";
import type { FormEvent } from "react";
import { useState } from "react";
import { useNavigate } from "react-router";

const sxHome = {
    background: {
        position: "fixed",
        inset: 0,
        backgroundImage: "linear-gradient(to bottom, #FFF 10%, #F0F0FFFF 15%, #F0F0FFFF 80%, #FFF 90%)",
        backgroundSize: "cover",
        backgroundPosition: "50% 75%",
        width: "100%",
        height: "100vh",
        zIndex: -2,
    },
    backgroundVideo: {
        position: "fixed",
        left: 0,
        right: 0,
        top: "15%",
        bottom: "80%",
        width: "100%",
        height: "65%",
        zIndex: -1,
        "& video": {
            width: "100%",
            height: "100%",
            objectFit: "cover",
        },
    },
    content: {
        pt: "5%",
        mt: 2,
        p: 2,
    },
    cardHeader: {
        background: "linear-gradient(45deg, #CC88FF 20%, #223377 90%)",
        color: (theme: Theme) => theme.palette.primary.contrastText,
        p: 0.72,
    },
    instructions: {
        color: "text.primary",
        fontSize: "subtitle1.fontSize",
        lineHeight: 1.5,
        mt: 2,
        mb: 3,
    },
    footer: {
        position: "fixed",
        textAlign: "right",
        bottom: 1,
        left: 1,
        right: 1,
    },
} satisfies Record<string, SxProps<Theme>>;

function Home()
{
    const navigate = useNavigate();
    const [code, setCode] = useState<string>("");

    const startCall = () => navigate(`/call/${code}`);
    const submitCall = (event: FormEvent<HTMLFormElement>) =>
    {
        event.preventDefault();
        startCall();
    };

    return (
        <Box>
            <Container maxWidth="sm">
                <Box sx={sxHome.content}>
                    <Card elevation={8}>
                        <CardHeader sx={sxHome.cardHeader} />
                        <CardContent>
                            <Typography variant="h4" component="h4" color="textPrimary" gutterBottom sx={{ fontWeight: 700 }}>
                                Simple Video-Chat Demo
                            </Typography>

                            <Box component="p" sx={sxHome.instructions}>
                                Please enter a Room ID to join a video chat ...
                            </Box>

                            <form noValidate autoComplete="off" onSubmit={submitCall}>
                                <TextField fullWidth id="code" label="Room ID" variant="outlined" value={code} onChange={(event) => setCode(event.target.value)} />
                            </form>
                        </CardContent>

                        <CardActions>
                            <Button size="large" color="primary" disabled={code.trim().length === 0} startIcon={<ContactPhoneIcon />} onClick={startCall}>
                                Start video chat
                            </Button>
                        </CardActions>
                    </Card>
                </Box>
            </Container>

            <Box sx={sxHome.backgroundVideo}>
                <video loop muted autoPlay playsInline disablePictureInPicture>
                    <source src="/background.mp4" type="video/mp4" />
                </video>
            </Box>

            <Box sx={sxHome.background} />

            <Box sx={sxHome.footer}>
                <Button color="inherit" startIcon={<GitHubIcon />} href="https://github.com/janole/video-chat">github</Button>
                <Button disabled sx={{ textTransform: "none" }}>v {__APP_VERSION__}</Button>
            </Box>
        </Box>
    );
}

export default Home;
