# analytics

Roll my own analytics, based on [this simple stack consisting of AWS Lambda and Google sheets](https://www.pcmaffey.com/roll-your-own-analytics/). 

Ideally, the next step is to improve this based on [this more elaborate stack, Snowplow JS tracker vended by Cloudfront, posting to S3 which is then processed by Lambda and written back to S3 for lookup using Athena](https://bostata.com/client-side-instrumentation-for-under-one-dollar)

This Readme is part blog post, part todo-list for future me.

Provide basic analytics without resorting to add-tech trackers and respect user privacy.

## Requirements
Aside from respecting privacy, this project should be cheap to set up and run. The analytics need not be very complex as I only expect very small amounts of traffic if any. 

The technologies involved should be cheap or ideally free. And of course, some of them should be novel to me as an excuse to learn something new.

## Stack
- Client-side session/metrics
	- Can be embedded in static sites.
	- Free for me.
- AWS Lambda fronted by API gateway
	- Novel technology for me
	- Very cheap to use
	- Serverless is ideal for this use case. Infrequent jobs that are short and self-contained
- Data stored in a Google sheet
	- Free
	- Simple to use

### Events

The repo contains a JS and Ruby client. Only the latter works at the moment.

The JS code attempts to batch up all the analytics and send them when the session ends. I had trouble getting event handlers to fire when the "session" ends, gave up quickly, and just instrumented the backend because it worked for what I was doing.

#### TODO:
- JS Client
- Client instrumentaion.
- Use Snowplow JS tracker for richer events

### Lambda
The Lambda function reads the incoming metric events, repackages them, and POSTs them to google sheets.

The function code is provisioned using Pulumi. The Pulumi playbook creates two API Gateway routes to use the function but they are pretty simple and just let everything through. 

The function can also be provisioned with a URL directly but that is not done here.

#### TODO
- Decide on one API gateway route, there is no need to have two different types
- Have some sort of access control. At the moment the Lambda URL is essentially a secret.

### Sheet
The Google sheet is nothing special aside from the associated script to allow data to be POSTed to it. The script is deployed as an "App Script" inside Google sheets.

This was a pain to get working because the developer experience is pretty poor and it is hard to debug failures.

The script itself is again nothing special. `doPost` handles all the networking, all the script has to do is parse the data and add it to the associated sheet.

It must be manually provisioned and deployed.

#### TODO
- Automatic provisioning. Hardly seems worth the time.

## End

With these 3 pieces I have a basic analytics pipeline I can quickly standup and deploy into any application/site.
