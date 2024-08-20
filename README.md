# Hacker News WatchDog

> Get updates from your favourite Hacker News threads or comments

## Get started

To use the bot you must have an Telegram account. You can use our bot in both browsers and mobile devices. We recommend using Telegram Desktop or Telegram iOS/Android apps.

1. Open the web app in your browser: [https://hacker-news-watchdog.web.app](https://hacker-news-watchdog.web.app).
2. Click on **Connect with Telegram**.
3. Follow the instructions of the Bot.

Or you can check the demo video

[![Hacker News WatchDog WebApp](https://assets.kanthorlabs.com/hackernewswatchdog/placeholder.jpg)](https://assets.kanthorlabs.com/hackernewswatchdog/demo.mp4)

## Usage

We are supporting two kind of entities to get updates: a thread or a comment.

- Use a link: `/watch https://news.ycombinator.com/item?id=41284703`
- Use a ID: `/watch 41277014`
- Watch for a comment: `/watch https://news.ycombinator.com/item?id=41286459`

## Features

- You will receive updates on all threads or comments if there have been any changes within the scheduled time. The default schedule policy backs off for `30 * 60 + attempts ^ 4 * (1 + rand(±10%)) * 60` seconds, with the maximum number of attempts set to 10 by default. This results in exactly 10 scheduled checks.

  - After `1854s` (30m 54s) since the thread or comment watcher was created
  - After `2684s` (44m 44s) since the 1st schedule
  - After `6352s` (1h 45m 52s) since the 2nd schedule
  - After `15977s` (4h 26m 17s) since the 3rd schedule
  - After `39040s` (10h 50m 40s) since the 4th schedule
  - After `80867s` (22h 27m 47s) since the 5th schedule
  - After `145718s` (1d 16h 28m 38s) since the 6th schedule
  - After `247564s` (2d 20h 46m 4s) since the 7th schedule
  - After `434145s` (5d 0h 15m 45s) since the 8th schedule
  - After `641928s` (7d 10h 32m 8s) since the 9th schedule

- A simple statistics webapp: [Hacker News WatchDog WebApp](https://hacker-news-watchdog.web.app)

## Limitations

- Due to the limitations of our resource, each user can only watch up to **10** threads or comments.
- We can only observe one deep level of a thread or comment
- Message could not be sent if the post contains invalid markdown characters

## Thank you

- [River Queue](https://github.com/riverqueue/river) for backs off policy inspiration.
