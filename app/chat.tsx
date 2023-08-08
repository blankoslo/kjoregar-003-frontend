"use client"

import { SyntheticEvent, useEffect, useRef, useState } from 'react';
import styles from './chat.module.css'
import { Avatar } from './avatar';

const Block = ({ message }: { message: { key: string, human: string, robot: string } }) => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setTimeout(() => ref.current?.scrollIntoView({ behavior: 'smooth' }), 350);
    }, [message]);

    return (
        <div ref={ref} className={styles.block}>
            <div className={styles.human}>
                {message.human.split("\n").map((h) => (
                    h && <p key={h}>{h}</p>
                )).filter(Boolean)}
            </div>
            <div className={styles.robot}>
                <div className={styles.text}>
                    {message.robot.split("\n").map((r) => (
                        r && <p key={r}>{r}</p>
                    )).filter(Boolean)}
                </div>
                <div className={styles.image}>
                    {!message.image && "🧠 🎨..."}
                    {message.image && (
                        <img
                            src={`data:image/png;base64, ${message.image}`}
                            alt="Image from SD"
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

export const Chat = () => {
    const formRef = useRef<HTMLFormElement | null>(null);
    const [topic, setTopic] = useState<string>('gpt-oasst-llama2');
    const [topicResources, setTopicResources] = useState<string>(`${topic}-resources`);
    const [status, setStatus] = useState('disconnected');

    const uuid = useRef<string | null>(null);
    const ws = useRef<WebSocket | null>(null);

    const [text, setText] = useState('');
    const [messages, setMessages] = useState([]);

    const [texture, setTexture] = useState<string| undefined>()

    useEffect(() => {
        uuid.current = crypto.randomUUID();
        ws.current = new WebSocket('ws://localhost:3030');
        ws.current.onopen = () => {
            console.log('ws open');
            subscribe();
        };
        ws.current.onclose = () => console.log('ws close');


        return () => {
            ws.current?.close();
        };
    }, []);

    useEffect(() => {
        if (ws.current) {
            ws.current.onmessage = (e) => {
                console.log('message update from subscription', e.data);
                try {
                    const payload = JSON.parse(e.data);

                    if (payload.type === 'SystemResourceUpdate') {
                        console.log("Resouce update", payload.resources);
                        setStatus(payload.resources);
                    } else if (payload.type === "ChatMessageRobotResponse") {
                        console.log(payload);
                        const msg = messages.findIndex(m => m.key === payload.id);

                        if (msg > -1) {
                            console.log("found message!");
                            const updatedMessages = messages.map(m => {
                                if (m.key === payload.id) {
                                    return {
                                        key: payload.id,
                                        human: m.human,
                                        robot: payload.robot
                                    }
                                }
                                return m;
                            });

                            setMessages(updatedMessages);
                            // request an image of the response
                            requestImage(payload.id, payload.robot);
                        }
                    } else if (payload.type === "ChatMessageRobotStreamResponse") {
                        console.log(payload);
                        const msg = messages.findIndex(m => m.key === payload.id);

                        if (msg > -1) {
                            console.log("found message!");
                            const updatedMessages = messages.map(m => {
                                if (m.key === payload.id) {
                                    return {
                                        key: payload.id,
                                        human: m.human,
                                        robot: m.robot + payload.robot
                                    }
                                }
                                return m;
                            });

                            setMessages(updatedMessages);
                        }
                    } else if (payload.type === "ChatImageRobotResponse") {
                        console.log(payload);
                        const msg = messages.findIndex(m => m.key === payload.id);

                        if (msg > -1) {
                            console.log("found message!");
                            const updatedMessages = messages.map(m => {
                                if (m.key === payload.id) {
                                    return {
                                        key: payload.id,
                                        human: m.human,
                                        robot: m.robot,
                                        image: payload.robot
                                    };
                                }
                                return m;
                            });

                            setMessages(updatedMessages);
                        }
                    } else if (payload.type === "ChatAvatarRobotResponse") {
                        setTexture(payload["robot"])
                    }
                } catch (err) {
                    console.warn(err);
                }
            }
        }
    }, [messages, setMessages]);

    const subscribe = () => {
        if (ws.current && uuid.current) {
            ws.current.send(JSON.stringify({ cmd: "sub", topic: uuid.current }));
            ws.current.send(JSON.stringify({ cmd: "sub", topic: topicResources }));
        }
    };

    const publishMessage = (key: string, previous: { human: string, robot: string }[], message: string, stream: boolean = true) => {
        const payload = JSON.stringify({
            cmd: 'pub',
            topic,
            replyTopic: uuid.current,
            type: 'ChatMessageCreate',
            id: key,
            stream,
            previous,
            human: message
        } as ChatMessageCreate); // TODO safety

        if (ws.current) {
            ws.current.send(payload);
        }
    };

    const requestImage = (key: string, prompt: string) => {
        const payload = JSON.stringify({
            cmd: 'pub',
            topic: 'sd-2-1',
            replyTopic: uuid.current,
            type: 'ChatImageCreate',
            id: key,
            human: prompt,
        });

        if (ws.current) {
            ws.current.send(payload);
        }
    }

    const requestTexture= (key: string) => {
        const payload = JSON.stringify({
            cmd: 'pub',
            topic: 'sd-2-1',
            replyTopic: uuid.current,
            type: 'ChatAvatarCreate',
            id: key,
        });

        if (ws.current) {
            ws.current.send(payload);
        }
    }

    return <><div>
        <div className={styles.buffer}>
            {messages.map((l) => {
                return <Block key={l.key} message={l} />;
            })}
        </div>
        <form ref={formRef} className={styles.inputs} method="post" onSubmit={(e: SyntheticEvent<HTMLFormElement>) => {
            e.preventDefault();
            const text = new FormData(e.currentTarget).get('text');

            // include context previous of up to 2 blocks
            const previous = (messages.length < 2 ? messages : messages.slice(-4)).map(m => ({
                human: m.human,
                robot: m.robot,
            }));

            if (text && typeof text === 'string') {
                const key = crypto.randomUUID();
                const isStream = true;

                publishMessage(key, previous, text, isStream);
                // request a new texture
                requestTexture(key);
                setMessages([
                  ...messages,
                  { key, human: text, robot: isStream ? "" : "🧠" },
                ]);
                setText('');
            }
        }}>
            <div className={styles.inputContainer}>
                <textarea className={styles.input} name="text" value={text} onKeyDown={(e) => {
                    if (e.key === "Enter" && e.shiftKey == false) {
                        formRef.current?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
                        e.preventDefault();
                    }
                }} onChange={e => setText(e.currentTarget.value)}></textarea>
                <button type="submit" className={styles.send}>✉️</button>
            </div>
            <footer className={styles.credits}>BlankGPT UI running {topic} [{status}]. Kjøregår #003</footer>
        </form>
    </div>
        <Avatar texture={texture} /></>
};
