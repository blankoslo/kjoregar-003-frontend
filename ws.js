const { WebSocketServer, WebSocket } = require("ws");
const wss = new WebSocketServer({ port: 3030 });

const subscriptions = {}; // topic -> client[]

const subscribe = (topic, client) => {
  console.log(`Subscribing to topic ${topic}`);

  if (!subscriptions[topic]) {
    subscriptions[topic] = [client];
  } else if (!subscriptions[topic].find((s) => s === client)) {
    subscriptions[topic].push(client);
  } else {
    console.error(`Client was already subscribed to ${topic}`);
  }
};

const publish = (ws, topic, jobChunk, data, isBinary) => {
  console.log(`Publishing to topic ${topic} using data ${data}`);

  const subscribers = subscriptions[topic] || [];

  subscribers.forEach(function each(client) {
    if (client !== ws && client.readyState === WebSocket.OPEN) {
      client.send(data, { binary: isBinary });
    }
  });

  if (subscribers.length === 0) {
    console.warn(`There were no subscribers for ${topic}`);
  }
};

wss.on("connection", function connection(ws) {
  console.log("client connected");
  ws.on("error", console.error);

  ws.on("message", function message(data, isBinary) {
    console.log("received message: %s", data);

    const { cmd, topic, ...rest } = JSON.parse(data);

    if (cmd === "pub") {
      console.log("publish command!");
      publish(ws, topic, undefined, JSON.stringify(rest), isBinary);
    } else if (cmd === "sub") {
      console.log("subscribe command!");
      subscribe(topic, ws);
    }
  });

  ws.on("close", function close() {
    console.log("client closed connection");
    Object.values(subscriptions).forEach((clients) => {
      const clientSubscription = clients.indexOf(ws);
      if (clientSubscription > -1) {
        clients.splice(clientSubscription, 1);
        console.log("deleted client from subscriptions");
      }
    });
  });

  ws.send("something");
});

console.log("Listening for websockets on port 3030");
