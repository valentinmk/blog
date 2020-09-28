---
title: Python and Tarantool Races in the Loop
description: Using aiohttp, Sanic and Japronto to figure out how fast a web simple CRUD application can be with Python and Tarantool on board.
author: valentinmk
date: 2017-05-17T12:00:00.000Z
tags: python, tarantool,asyncio
---


## Preface

Some time ago I read an article on Tarantool and PHP called [Stress test for Nginx + PHP + Tarantool](https://hackernoon.com/tarantool-stress-testing-1195f33254f9). The author took a small server with 1 CPU, 512 MB of RAM and some SSD space, and conducted stress tests with PHP and Tarantool. The result was 900 RPS on a web page with template rendering, session handling, inserting a session into the DB and reading 9 top records sorted by rating from a table with ~16,200 Telegram stickers.

```text
wrk -c50 -d60s -t4 http://ugly.begetan.me/good
Running 1m test @ http://ugly.begetan.me/good
  4 threads and 50 connections
  Thread Stats   Avg      Stdev    Max      +/- Stdev
    Latency     54.48ms  10.15ms  441.17ms   95.62%
    Req/Sec     220.76   19.43    270.00     74.65%
52760 requests in 1.00m, 320.86MB read
Requests/sec: 878.72
Transfer/sec: 5.34MB
```

The technical details are well described in the [Tarantool: the Good, the Bad and the Ugly article](https://medium.com/towards-data-science/tarantool-the-good-the-bad-and-the-ugly-1be5c5e04dd3).

In this article, I'm speaking about Python and I'm going to start with a story about PHP + Tarantool that give 900 RPS on a web page that renders HTML and makes 3 DB requests (insert, select and select calculated data).

I couldn't resist saying, "Challenge accepted!"
[Click here to open the demo site.](https://medium.com/r/?url=http%3A%2F%2Fstickers.teslarnd.ru%2F)

Our journey begins. Fasten your seatbelt, keep calm and enjoy.

## TL;DR

In this article, I'll be using aiohttp, Sanic and Japronto to figure out how fast a web server can be with Python and Tarantool on board.

First of all, there is a [quick test](https://gist.github.com/danikin/a5ddc6fe0cedc6257853) written in pure C that shows us a potential one million Tarantool transactions per second.

I tried to create 1m dummy Python objects that simulate Tarantool transaction results and got these figures:

```text
Execution time:  4.84s
Request per second: 206709
```

This result is to be expected: Python is an interpreted language after all. Theoretically, our Python code can't be faster than ~200k RPS. Below are final results in one picture:

![https://miro.medium.com/max/1575/1*xcus7c1DX2bvzfQIU4XeGQ.png](https://miro.medium.com/max/1575/1*xcus7c1DX2bvzfQIU4XeGQ.png)
[https://docs.google.com/spreadsheets/d/1bdfoLOxT4N0xLjlSYltZMX6zqkIO0mJGvLlkUgAGBc8/pubchart?oid=945895680&format=interactive](https://docs.google.com/spreadsheets/d/1bdfoLOxT4N0xLjlSYltZMX6zqkIO0mJGvLlkUgAGBc8/pubchart?oid=945895680&format=interactive)

You can find the source code [here](https://github.com/valentinmk/python-tarantool-benchmark-and-bootstrap).

## Some backgrounds

### What I'll be testing

The demo site consists of 5 sections.

1. `Index` is where the voting happens: this page shows 2 images for us to choose between. This page has 9 requests to Tarantool:
   1. 2 selects for getting a random picture (2 selects, 1 insert for each):
   2. select a random number from Tarantool (calls a built-in function)
   3. select a token from Tarantool (eval MD5 calculation for the previously selected number)
   4. insert the token into the secret space
   5. create and insert a user session UUID (1 select, 1 upsert):
   6. select a session UUID from Tarantool (eval UUID calculation)
   7. upsert a user's information with the UUID into the session space
   8. update server statistics (1 update)
2. The `Good` section shows 9 top-rated stickers. This page has 3 requests to Tarantool:
   1. select top 9 stickers from a Tarantool space (table) with 16k records (something like `select top(9) from stickers order by rating ASC`)
   2. create and insert a user session UUID (1 select, 1 upsert):
      1. select a session UUID from Tarantool (eval UUID calculation)
      2. upsert a user's information with the UUID into the session space
3. The `Bad` section shows 9 worst rated stickers. Bad behaves the same as Good and also has 3 requests in total.
4. The `Ugly` section simply displays the word "Ugly" (there's no calculation here), so I can benchmark how fast the web server is.
5. The `About` section renders the template, pastes the contents of the title tag in the Jinja template and generates an HTML response.

### Environment

I'm using a t2.nano Ubuntu server with 1 CPU, 512 MB of RAM and an 8 GB General Purpose SSD 100/3000 IOPS. In fact, I don't need a disk at all, that's why I'll be avoiding unnecessary disk IO at all costs. So my spec is as follows:

```text
model name      : Intel(R) Xeon(R) CPU E5-2676 v3 @ 2.40GHz
cpu MHz         : 2400.062
cache size      : 30720 KB
bogomips        : 4800.12
```

The SSD is…erm… well, I wouldn't call it SSD in terms of speed, but… take a look at this:

```text
sudo hdparm -t /dev/xvda1
/dev/xvda1:
 Timing buffered disk reads: 246 MB in  3.02 seconds =  81.37 MB/sec
```

### Why wrk with 127.0.0.1

In the article on PHP and Tarantool, the author was using wrk from another server in the same data center. I was doing the same until I received some very strange performance results.

First, I'm going to show you the problem and then explain it.

Below are wrk results for my AMD Neo2 (1.4 MHz) home Ubuntu server placed on top of the fridge 15 km away.

```text
valentin@vktest:~$ wrk -c100 -d30s -t4 http://tesla***.mykeenetic.ru:1717/good
Running 30s test @ http://tesla***.mykeenetic.ru:1717/good
4 threads and 100 connections
  Thread Stats   Avg      Stdev     Max   +/- Stdev
    Latency   209.89ms   86.43ms   1.75s    93.42%
    Req/Sec   122.87     28.80   230.00     73.39%
    14653 requests in 30.03s, 98.20MB read
  Requests/sec:    488.00
  Transfer/sec:      3.27MB
```

Here are the wrk results for my t2.nano Ubuntu server working 9,000 km away from my home server.

```text
valentin@vktest:~$ wrk -c100 -d30s -t4 http://ec2-54-214-103-133.us-west-2.compute.amazonaws.com:1717/good
Running 30s test @ http://ec2-54-214-103-133.us-west-2.compute.amazonaws.com:1717/good
4 threads and 100 connections
  Thread Stats   Avg      Stdev     Max   +/- Stdev
    Latency   218.49ms   62.68ms   1.76s    96.55%
    Req/Sec   117.73     31.67   242.00     69.26%
    13777 requests in 30.03s, 92.43MB read
  Socket errors: connect 0, read 0, write 0, timeout 1
  Requests/sec:    458.72
  Transfer/sec:      3.08MB
```

Latency for both servers is below:

- home servers - 11.6 ms
- t2.nano - 206 ms

_Explanation_: Suppose both web servers and wrk hosts are placed in the same data center - would it guarantee their being in the same rack? If this is true, then OK, we might assume that there is no network latency.

But what if it's not true?

I don't want to test network quality and deal with this type of measurements. I'll be using wrk in my benchmarks to test only the pure performance of the site.

With this approach, all results are "theoretically maximum": they'll be lower in a real-life environment.

### Why I don't use Nginx

I won't be using Nginx for a proxy pass to my site, because I'm already in a "theoretically maximum" area and, in fact, I got a CPU race between Python and Nginx on one core (not to mention that Tarantool needs CPU too).

Spoiler: in some further tests, Nginx didn't prove fast enough.

### Boring part with a lot of technical details

I did a huge homework to scrap all Telegram stickers to Tarantool. I rebuilt my database to have the same structure as in the source publication.

I coded the benchmark with different web server engines in mind.

`server.py` gets the following command-line arguments:

- `p`  -  port for binding by the web server
- `e`  -  engine to run the web server with a specific framework or loops
- `l`  -  logging for the control console and performance tuning

The general structure of the project is as follows:

```text
-server.py # gets args from the command line, creates a loop and
 |         # launches the web server
 |-data_interface  # provides a unified interface for the web
 | |               # server, so the server knows nothing about the
 | |               # current DB that it's using
 | |- tarantool_driver.py  # provides a Tarantool interface for
 | |                       # the web server (sort of Model, but
 | |                       # with some Controller functions)
 | |- postgres_driver.py   # the same for Postgres aiohttp_server
 |- handler.py  # contains a helper class for the web server. This
 |              # class knows the initial configuration of the web
 |              # server and how to start/stop it. It contains
 |              # an Index page handler for testing purposes.
 |- aiohttpmulticonnect.py # tests Tarantool connection  each time
 |                         # an  HTTP request is handled. It
 |                         # inherits from the handler.py base class
 |                         # to provide all methods for server.py.
 |- aiohttponeconnect.py   # opens one Tarantool connection
 |                         # and uses it while the web server is
 |                         # running
 |- aiohttponeconnectpg.py # the same for Postgres (this is a
 |                         # development artifact, Postgres must
 |                         # also use aiohttponeconnect.py)
 |- templates              # folder for Jinja2 templates
```

`server.py` receives the engine argument, then switch-cases it to get the starting function and parameters:

```python
switch_engine = {
      "aiohttp-tarantool-multi":
      {
          "engine": aiohttp_tarantool_multi,
          "uvloop": False
      },
      "aiohttp-tarantool-one-uvloop":
      {
          "engine": aiohttp_tarantool_one,
          "uvloop": True
      },
      "aiohttp-tarantool-one": {
          "engine": aiohttp_tarantool_one,
          "uvloop": False
      },
      "aiohttp-postgres-pool": {
          "engine": aiohttp_postgres_pool,
          "uvloop": False
      },
      # .......
}
```

Inside the starter function:

```python
def aiohttp_tarantool_one(port=None, uvloop_enable=False):
    # ... getting correct loop
    from data_interface.tarantool_driver import TarantoolDriver
    from aiohttp_server.aiohttponeconnect import AiohttpTarantoolOne
    db = TarantoolDriver()
    web_server = AiohttpTarantoolOne(loop=loop, port=port, db=db)
    loop.create_task(web_server.start())
    return loop
```

Firing the loop:

```python
# try run function to configure webserver/db driver/get event loop
try:
    loop = switch_engine[engine]["engine"](
        port=port,
        uvloop_enable=switch_engine[engine]["uvloop"])
except KeyError as e:
    raise ValueError('Undefined unit: {}'.format(e.args.pop()))
# fire loop
try:
    logging.info("  --> Start main loop.")
    loop.run_forever()
except KeyboardInterrupt:
    logging.info("  < Stopping loop.")
    pass
except:
    logging.error(traceback.format_exc())
finally:
    loop.stop()
    pending = asyncio.Task.all_tasks(loop=loop)
    for task in pending:
        task.cancel()
        with suppress(asyncio.CancelledError):
            loop.run_until_complete(task)
    logging.info("   <- Main loop stopped.")
loop.close()
logging.info("  <-- Main loop closed.")
```

## Highway rider / aiohttp + Tarantool vs. aiohttp + asyncpg / Python 3.5 vs. Python 3.6

As the first benchmark, I'll use the aiohttp web framework, one of the first asynchronous (asyncio library in particular) web servers for Python. Pure Python code, no cheats, no tricks.

Additionally, I'm going to test the performance of different versions of Python (3.5.3. and 3.6.1).

## Tarantool

Let's see what Tarantool has to offer: [https://tarantool.org](https://tarantool.org).

There are MessagePack tuples, Lua application server, memory allocation mechanism and write-ahead log inside Tarantool. All data is stored in memory and processed incredibly fast.

MessagePack is faster and smaller than JSON. It stores messages in bytecode, and you can't read them like JSON messages.
When you create a new record in Tarantool, it allocates slots of memory for this tuple and provides access to it. All tuples (they might be called rows) are stored in spaces (they might be called tables), and tuples are divided into fields. Spaces have primary or secondary keys. Each field can contain simple data, like integer or text, or compound data, such as a tuple or an address link to another table. Every tuple can be extended with new data, but mandatory data must be entered into fields that have primary or secondary keys set on them. Keys support the TREE, RTREE, BITSET and HASH indexing algorithms.

Each operation (with data in a database) is a built-in Lua function. For example, to run a join query you have to implement you own Lua function that joins the tables. Within this function, you need to iterate over one record in a space and add data from records of another space, and then return a consolidated dataset.

Configuring Tarantool is simple. In fact, the configuration file is a long Lua script, where you declare spaces, fields, indexes, create users and can implement custom data transformation functions. Moreover, you can run a web server and all other features provided by Lua.
Lua performance can be compared to that of Java. Lua is much faster than Python, but a little slower than Java. In my case, I needed to take into consideration that Tarantool calculates data faster than the main application with Python would.

Snapshotting is a mechanism that provides on-disk storage for in-memory data. Tarantool loads snapshots at startup and then additionally loads data from the WAL for unsaved transactions. You can safely stop and run the Tarantool server without losing your data.

Replication (master-slave, master-master) and sharding mode allow building very sophisticated architectures. The built-in Lua language makes it possible to handle all database architecture-specific aspects within Tarantool, so you don't need to overload your application code.

As for stability, Tarantool is stable alright. I haven't noticed any problems or bugs. If you reserve 128 MB of memory and use it all up, you will get a "could not allocate memory" message on insert, but you'll still be able to connect to the DB and read data and, in some cases, upsert records. There're no crashes or lags. But you should keep in mind that this is all about memory space. You can't run three 256 MB Tarantool instances at the same time on a server with 512 MB of RAM. Well, actually, you can do this, though the more data is stored in these instances, the more memory they need, and at some point the OS will start killing them to free some memory.

## My buzzword list for Tarantool

- `aiohttp-tarantool-multi - aiohttp` web framework creates a new Tarantool connection on each page request. The scenario is the same as the PHP example mentioned above.
- `aiohttp-tarantool-one` - aiohttp web framework creates one Tarantool connection and uses it all the time. The script auto-reconnects to Tarantool if the database goes offline for a while or if it loses connection (bonus feature provided by the aiotarantool library).
- `aiohttp-tarantool-one-uvloop ` -  same as aiohttp-tarantool-one, but using uvloop instead of a standard asyncio loop.

## Tests results / Tarantool + aiohttp / asyncio vs. uvloop / Python 3.5 vs. Python 3.6

![https://cdn-images-1.medium.com/max/1800/1*0xvuNJA_prwBPjVLhTZ6tQ.png](https://cdn-images-1.medium.com/max/1800/1*0xvuNJA_prwBPjVLhTZ6tQ.png)
[[https://docs.google.com/spreadsheets/d/1bdfoLOxT4N0xLjlSYltZMX6zqkIO0mJGvLlkUgAGBc8/pubchart?oid=957561661&format=interactive]](https://docs.google.com/spreadsheets/d/1bdfoLOxT4N0xLjlSYltZMX6zqkIO0mJGvLlkUgAGBc8/pubchart?oid=957561661&format=interactive)

### Brief conclusions

- I have ~1000 RPS on the `Index` page and ~1500 RPS on the `Good` page with Tarantool.
- The cost of connecting to Tarantool is very high - ~110 RPS on the `Index` and `Good` pages with connections to Tarantool on every request.
- `About` and `Ugly` show the same RPS as PostgreSQL (see below), because only aiohttp is used and no DB requests are made.

## PostgreSQL

PostgreSQL has a new `JSONb` type and allows working with it as with native JSON storage. I recreated the data architecture with this JSONb feature - and this was painful.

Another way was to use PostgreSQL's array feature, but when I found this feature, it was too late to rewrite the whole code. Below is an example of how to work with tuples in Python as part of `JSONb` data in Postgres.

Upsert with PostgreSQL and `JSONb` was hard to code and to test. You can find an example in the source code. The statement looks something like this:

```sql
INSERT INTO sessions (data)
VALUES (
 '[
   "dcddbc803b387a2fd3a35087ea613420",
   1491829389,
   0,
   "192.168.99.1",
   "browser info"
 ]')
on conflict (((data ->> 0)::uuid))
 do update set data =
 jsonb_set(
   jsonb_set(
     jsonb_set(
       jsonb_set(SESSIONS.data, '{1}','1491829389'),
       '{2}',
       (select (((data->>2)::int+1)::text)::jsonb from sessions
        where data->>0 = 'dcddbc803b387a2fd3a35087ea613420')),
     '{3}', '"192.168.99.1"'),
   '{4}', '"new browser info"')
```

For a database driver, I'm using `asyncpg`, currently the fastest asynchronous Python driver.

## Problems

The first time around, I received a poor result: about 64 RPS on Index and 100 RPS on Good.

After rewriting the select statement, taking one sticker from a table with 16k records and rechecking the code to remove the fetch function (replaced it with execute) on delete, the update statement produced the following result: 190 RPS on Index and… 110 RPS on Good… Well, that was strange.

By searching, investigating and giving prepared statements a try, I achieved 650 RPS on Good on my dev machine. But I couldn't reproduce it on the t2.nano instance. The code would crash and produce an error: "cannot perform operation: another operation is in progress". My best guess is that prepared statements with asyncpg can't work on a single-CPU server, but this issue is beyond the scope of the article.

The next try was to find the root cause of the 100 RPS problem and run explain for the SQL statement. As a result, I found out that indexing wasn't done in the right order. I fixed it as follows:

```sql
CREATE INDEX stickers_data_indx_rating_1 ON stickers
USING BTREE(((data ->> 1)::int));
```

This index fixed the performance issue, see the results below.

## Tests results / PostgreSQL + aiohttp / asyncio vs. uvloop / Python 3.5 vs. Python 3.6

![https://cdn-images-1.medium.com/max/1800/1*nKlOV0uKRXkVJfx9q7x7-Q.png](https://cdn-images-1.medium.com/max/1800/1*nKlOV0uKRXkVJfx9q7x7-Q.png)
[[https://docs.google.com/spreadsheets/d/1bdfoLOxT4N0xLjlSYltZMX6zqkIO0mJGvLlkUgAGBc8/pubchart?oid=1256524977&format=interactive]](https://docs.google.com/spreadsheets/d/1bdfoLOxT4N0xLjlSYltZMX6zqkIO0mJGvLlkUgAGBc8/pubchart?oid=1256524977&format=interactive)

## Best PostgreSQL results vs. best Tarantool results with aiohttp

![[https://cdn-images-1.medium.com/max/1800/1*Ozb2WRA_spzYHLqp6lOh7A.png]](https://cdn-images-1.medium.com/max/1800/1*Ozb2WRA_spzYHLqp6lOh7A.png)
[https://docs.google.com/spreadsheets/d/1bdfoLOxT4N0xLjlSYltZMX6zqkIO0mJGvLlkUgAGBc8/pubchart?oid=80019928&format=interactive](https://docs.google.com/spreadsheets/d/1bdfoLOxT4N0xLjlSYltZMX6zqkIO0mJGvLlkUgAGBc8/pubchart?oid=80019928&format=interactive)

## Conclusion

In my example, Tarantool proved ~7 times faster in the DB-intensive scenario and ~3 time faster in the rarely intensive scenario than PostgreSQL.

In all scenarios, uvloop was faster than a standard asyncio loop and Python 3.6 was faster than Python 3.5.

## Give me speed / Sanic + Tarantool

Sanic is a young web server based on the idea of using a Node.js HTTP parser C library that was originally developed for Nginx and first mentioned in the ["uvloop: Blazing fast Python networking"](https://medium.com/r/?url=https%3A%2F%2Fmagic.io%2Fblog%2Fuvloop-blazing-fast-python-networking%2F) blog post.

While creating a benchmark for uvloop, folks from MagicStack found out that the aiohttp HTTP parser is really slow. To better benchmark uvloop, they created a Python binding for a C library called httptools. Sanic wrapped this solution into a Flask-like web server, so now we have a fast and simple web server.

## A couple of words about Sanic

It's simple, has a good community and offers a very nice list of extensions. Sanic was easily integrated into my architecture. There were some conversations on Sanic-related issues in support threads, but they could be resolved with a create_server coroutine. I can set up and run a web server in my own loops. Indeed, I can run Sanic with a simple asyncio loop instead of uvloop.

You can check other limitations of Sanic in [Sanic official GitHub repository](https://github.com/channelcat/sanic).

## Problems Sanic

When I tried to test wkr with pipelining, Sanic threw this error in the console: "UnboundLocalError: local variable 'keep_alive' referenced before assignment". More on that here: [https://github.com/channelcat/sanic/pull/516](https://github.com/channelcat/sanic/pull/516).

Sanic does not actually support pipelining, but the feature is currently in development. You can check its dev status at [https://github.com/channelcat/sanic/pull/472](https://github.com/channelcat/sanic/pull/472). Pipelining with Sanic is beyond the scope of this article, but you could try it by yourselves.

## My buzzword list for Sanic

- `sanic-tarantool-one ` -  Sanic web framework working in the asyncio event loop plus one persistent Tarantool connection.
- `sanic-tarantool-one-uvloop ` -  same as above, but using uvloop instead.

## Test results / Tarantool + Sanic / asyncio vs. uvloop / Python 3.5 vs. Python 3.6

![https://cdn-images-1.medium.com/max/1800/1*4UAvxkfqWeD0z641-XjECw.png](https://cdn-images-1.medium.com/max/1800/1*4UAvxkfqWeD0z641-XjECw.png)
[https://docs.google.com/spreadsheets/d/1bdfoLOxT4N0xLjlSYltZMX6zqkIO0mJGvLlkUgAGBc8/pubchart?oid=1922761719&format=interactive](https://docs.google.com/spreadsheets/d/1bdfoLOxT4N0xLjlSYltZMX6zqkIO0mJGvLlkUgAGBc8/pubchart?oid=1922761719&format=interactive)

## Brief conclusions Sanic

- I have ~1800 RPS with the `Index` page and ~3000 RPS with the `Good` page: it's almost 2 times faster than the aiohttp example.
- The `About` page is 3 times faster than the aiohttp example with a simple Jinja template.
- `Ugly` (with no calculation) is 2.4 times faster than the aiohttp example producing simple text output.

## Conclusion Sanic

Sanic is the best choice if you like Flask and need a fast web server.

## Insane / Japronto + tarantool

[Japronto](https://github.com/squeaky-pl/japronto) is neither a web framework nor a web server. According to the developers, "Japronto is a screaming-fast, scalable, asynchronous Python 3.5+ HTTP toolkit". The HTTP toolkit is a very important issue. Another important issue is pipelining of HTTP requests. I'll try to explain its main disadvantage. When you fire many different latency requests to the server at the same time, all of them come to the server at different times, but the server has to handle them one by one in the order they come. As a result, the web server has to block itself and to build the right order of responses. At this moment, it becomes some sort of a blocking server. On a low-latency client or on localhost, you never get this effect, but, theoretically, in real life it becomes a huge problem.

## Problems whit Japronto

I have three big problems with Japronto.

I've implemented a class structure for the project. The `JaprontoHelper` class takes care of configuring and starting the server and the `JaprontoTarantoolOne` class handles pages and communicates with a database interface. Everything was going fine until I tried to start my OOP code.

_First_, simple `async def handle(self, request)` said that `'self' is not defined`. I took a closer look at this bug … It turned out this is a sort of a feature: Japronto "decompiles" your handler request function to figure out if there's the true async function. If you need more information, check these links:

- [Using await slows down requests #10](https://github.com/squeaky-pl/japronto/issues/10)
- [analyzer.py#L43](https://github.com/squeaky-pl/japronto/blob/master/src/japronto/router/analyzer.py#L43)

_Second_, I was really surprised to discover that I actually couldn't run pipelining tests on requests with an async function inside. More on it here: [pipelining and async handlers don't mix #46](https://github.com/squeaky-pl/japronto/issues/46).

_Third_, you can't use your own loop. App.start creates its own loop and launches run_until_complete by itself. A little bit selfish I'd say. But I wanted to get control over loops - and I did take it. It's not the correct way to solve the problem, but you can use app._loop to take control over this behavior ([dig the source code](https://github.com/squeaky-pl/japronto/blob/master/src/japronto/app/__init__.py#L37)). However, it comes with some consequences. Now Japronto stops with an error caused by a second try to launch run_until_complete.

_Not a problem_, but when I tried to use an async loop instead of uvloop, some errors occurred. I checked them and got the result for the Index page, but this scenario isn't supported at all. Nobody guarantees that Japronto will work without uvloop, you just have to deal with it.

## Why so much talk about pipelining

I'll show you a simple example. Remember our About page? It renders a Jinja template and pastes the title. Look at this:

Pipelining off:

```text
ubuntu@ip-172-31-16-67:~$ wrk -c100 -d30s -t4 http://127.0.0.1:1717/about
Running 30s test @ http://127.0.0.1:1717/about
  4 threads and 100 connections
  Thread Stats   Avg      Stdev     Max   +/- Stdev
    Latency     3.69ms   96.32us   8.75ms   85.59%
    Req/Sec     6.80k   115.48     8.76k    77.25%
  812123 requests in 30.03s, 2.23GB read
Requests/sec:  27042.54
Transfer/sec:     76.00MB
```

Pipelining on:

```text
ubuntu@ip-172-31-16-67:~$ wrk -c100 -d30s -t1 -s pipeline_about.lua http://127.0.0.1:1717
Running 30s test @ http://127.0.0.1:1717
  1 threads and 100 connections
  Thread Stats   Avg      Stdev     Max   +/- Stdev
    Latency    29.91ms   15.84ms  60.33ms   57.30%
    Req/Sec    42.94k   536.91    44.07k    75.00%
  1281477 requests in 30.01s, 3.52GB read
Requests/sec:  42708.16
Transfer/sec:    120.03MB
```

Larger latency (29.91ms vs. 3.69ms), but also a greater speed (42708.16 vs. 27042.54 RPS)!

## My buzzword list for Japronto

- `japronto-tarantool-one ` -  Japronto working in the asyncio event loop plus one persistent Tarantool connection.
- `japronto-tarantool-one` - uvloop - same as above, but using uvloop.

## Test results / Tarantool + Japronto / asyncio vs. uvloop / Python 3.5 vs. Python 3.6

![https://cdn-images-1.medium.com/max/1800/1*Gnwlh-YjeTTJ7Vjripl-gQ.png](https://cdn-images-1.medium.com/max/1800/1*Gnwlh-YjeTTJ7Vjripl-gQ.png)
[https://docs.google.com/spreadsheets/d/1bdfoLOxT4N0xLjlSYltZMX6zqkIO0mJGvLlkUgAGBc8/pubchart?oid=219297712&format=interactive](https://docs.google.com/spreadsheets/d/1bdfoLOxT4N0xLjlSYltZMX6zqkIO0mJGvLlkUgAGBc8/pubchart?oid=219297712&format=interactive)

## Japronto Brief conclusions

- I have ~ 2200 RPS with the `Index` page and about 4200 RPS with the `Good` page. It's more than 20% faster than the Sanic example and 2–3 times faster than aiohttp.
- `About` is insane: 3.3 times faster than Sanic and 8 times faster than aiohttp.
- `Ugly` is even more insane: 6 times faster than Sanic and 15 times faster than aiohttp.

## Some more brief conclusions

Below are the results for the Ugly page with pipelining (just simple text output, no calculations).

I'm splitting the numbers for you:

71 900 RPS (no pipeline) vs 573 493.31 RPS (with pipelining).

```text
ubuntu@ip-172-31-16-67:~$ wrk -c100 -d30s -t1 -s pipeline_ugly.lua http://127.0.0.1:1717
Running 30s test @ http://127.0.0.1:1717
  1 threads and 100 connections
  Thread Stats   Avg      Stdev     Max   +/- Stdev
    Latency     2.19ms    1.04ms   5.89ms   50.85%
    Req/Sec   576.57k     7.56k  598.79k    69.33%
  17211480 requests in 30.01s, 1.33GB read
Requests/sec: 573 493.31
Transfer/sec:     45.39MB
```

## Our limits / Tarantool tests

Well, I got results from many benchmarks of different Python web frameworks. I chose Japronto as the ideal option for my theoretical tests in the localhost environment. Let's see what Tarantool can do with this "slow" and "cheating" Python.

## Buzz words for Tarantool tests

- `select-sync - sync` function that selects top 9 stickers and handles a request with a simple text response (within it, I don't even return Tarantool select result to a local variable).
- `select-async ` -  same as above, but using an async version of select.
- `select-async-lite`  -  same as select-async, but not using an iterator in select.
- `upsert-async`  -  same as select-async, but using upsert.

## Tarantool test results

![https://cdn-images-1.medium.com/max/1800/1*-YUOYtAFAJYgA5rV4l1cxQ.png](https://cdn-images-1.medium.com/max/1800/1*-YUOYtAFAJYgA5rV4l1cxQ.png)
[https://docs.google.com/spreadsheets/d/1bdfoLOxT4N0xLjlSYltZMX6zqkIO0mJGvLlkUgAGBc8/pubchart?oid=589592134&format=interactive](https://docs.google.com/spreadsheets/d/1bdfoLOxT4N0xLjlSYltZMX6zqkIO0mJGvLlkUgAGBc8/pubchart?oid=589592134&format=interactive)

## Conclusions

- Theoretically, you can't get more than 15k RPS with a single Tarantool select statement. However, this is a great result. Every calculation made when selecting data decreases your RPS.
- If you use an iterator, or you could say a sorted result set, there's no performance decrease (at least for a table with 16k records).
- Upsert is more expensive: I get only 10k RPS; however, this is a great result. A simple insert statement might be faster (try it by yourselves).
- I tried pipelining with a sync version of the select statement and got about 9k RPS. Both with and without pipelining, the async version was almost 2 times faster.

## Final thoughts

- Python 3.6 is 10–20% faster than Python 3.5 . I think it's a great result for the entire Python community and the team of maintainers.
- With coroutines and async syntax, Python gets a huge performance boost just in time.
- New web frameworks take us to a new level of performance, at which good old databases would have to try hard to get the same speed as the main application.
- Tarantool is great: it's fast like Redis, though you can and even have to use it as a database.
