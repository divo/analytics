require 'json'

class AnalyticsClient
  include HTTParty

  # POST Analytics data to AWS Lambda
  # @param [String] url
  # @param [Hash] data
  def send_analytics(url:, created_at:, session_id:, user_id:, events:)
    Rails.logger.info "Sending analytics for #{events}"

    self.class.post(
      url,
      body: build_analytics(created_at, session_id, user_id, events).to_json,
      headers: { 'Content-Type' => 'application/json' }
    )
  rescue StandardError => e
    puts "HTTP Request failed (#{e.message})"
  end

  def build_analytics(created_at, session_id, user_id, events)
    session_data = {
      sessionId: session_id.to_s,
      userId: user_id
    }

    session_data[:events] = events.map do |event|
      {
        eventName: event,
        timestamp: created_at # Fine for now
      }
    end

    session_data
  end
end

