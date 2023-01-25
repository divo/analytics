require 'json'

def handler(event:, context:)
  data = JSON.parse(event['body'], object_class: OpenStruct)

  return {
    "statusCode": 200,
    "body": data.event.test,
  }
end
