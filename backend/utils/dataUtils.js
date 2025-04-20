// Helper function to simplify data
function simplifyData(data) {
    if (Array.isArray(data)) {
      return data.map(record => {
        // Extract all fields from the schemas
        const { 
          id, day, 
          // Sleep specific
          bedtime_start, bedtime_end, sleep_score, total_sleep_duration, deep_sleep_duration, 
          rem_sleep_duration, light_sleep_duration, awake_time, latency, efficiency, 
          restless_periods, average_heart_rate, lowest_heart_rate, average_hrv, 
          temperature_deviation, readiness, heart_rate, hrv,
          // Activity specific
          activity_score, active_calories, steps, equivalent_walking_distance,
          high_activity_time, medium_activity_time, low_activity_time, average_met_minutes,
          high_activity_met_minutes, inactivity_alerts, low_activity_met_minutes,
          medium_activity_met_minutes, meters_to_target, non_wear_time, resting_time,
          sedentary_met_minutes, sedentary_time, target_calories, target_meters, total_calories,
          // Readiness specific
          score, activity_balance, body_temperature, hrv_balance, recovery_index,
          resting_heart_rate, sleep_balance, previous_day_activity, previous_night,
          temperature_trend_deviation
        } = record;
        
        return {
          date: day instanceof Date ? day.toISOString().split('T')[0] : day,
          // Include all fields conditionally based on what's available
          // Sleep data
          ...(bedtime_start !== undefined && { bedtime_start }),
          ...(bedtime_end !== undefined && { bedtime_end }),
          ...(sleep_score !== undefined && { sleep_score }),
          ...(total_sleep_duration !== undefined && { 
            total_sleep_duration: Math.round(total_sleep_duration / 60) + " minutes" 
          }),
          ...(deep_sleep_duration !== undefined && { 
            deep_sleep_duration: Math.round(deep_sleep_duration / 60) + " minutes" 
          }),
          ...(rem_sleep_duration !== undefined && { 
            rem_sleep_duration: Math.round(rem_sleep_duration / 60) + " minutes" 
          }),
          ...(light_sleep_duration !== undefined && { 
            light_sleep_duration: Math.round(light_sleep_duration / 60) + " minutes" 
          }),
          ...(awake_time !== undefined && { 
            awake_time: Math.round(awake_time / 60) + " minutes" 
          }),
          ...(latency !== undefined && { latency: Math.round(latency) + " seconds" }),
          ...(efficiency !== undefined && { efficiency: efficiency + "%" }),
          ...(restless_periods !== undefined && { restless_periods }),
          ...(average_heart_rate !== undefined && { average_heart_rate }),
          ...(lowest_heart_rate !== undefined && { lowest_heart_rate }),
          ...(average_hrv !== undefined && { average_hrv }),
          ...(temperature_deviation !== undefined && { temperature_deviation }),
          ...(readiness !== undefined && { readiness }),
          ...(heart_rate !== undefined && { heart_rate }),
          ...(hrv !== undefined && { hrv }),
          
          // Activity data
          ...(activity_score !== undefined && { activity_score }),
          ...(active_calories !== undefined && { active_calories }),
          ...(steps !== undefined && { steps }),
          ...(equivalent_walking_distance !== undefined && { 
            equivalent_walking_distance: equivalent_walking_distance + " meters" 
          }),
          ...(high_activity_time !== undefined && { 
            high_activity_time: Math.round(high_activity_time / 60) + " minutes" 
          }),
          ...(medium_activity_time !== undefined && { 
            medium_activity_time: Math.round(medium_activity_time / 60) + " minutes" 
          }),
          ...(low_activity_time !== undefined && { 
            low_activity_time: Math.round(low_activity_time / 60) + " minutes" 
          }),
          ...(average_met_minutes !== undefined && { average_met_minutes }),
          ...(high_activity_met_minutes !== undefined && { high_activity_met_minutes }),
          ...(inactivity_alerts !== undefined && { inactivity_alerts }),
          ...(low_activity_met_minutes !== undefined && { low_activity_met_minutes }),
          ...(medium_activity_met_minutes !== undefined && { medium_activity_met_minutes }),
          ...(meters_to_target !== undefined && { meters_to_target }),
          ...(non_wear_time !== undefined && { 
            non_wear_time: Math.round(non_wear_time / 60) + " minutes" 
          }),
          ...(resting_time !== undefined && { 
            resting_time: Math.round(resting_time / 60) + " minutes" 
          }),
          ...(sedentary_met_minutes !== undefined && { sedentary_met_minutes }),
          ...(sedentary_time !== undefined && { 
            sedentary_time: Math.round(sedentary_time / 60) + " minutes" 
          }),
          ...(target_calories !== undefined && { target_calories }),
          ...(target_meters !== undefined && { target_meters }),
          ...(total_calories !== undefined && { total_calories }),
          
          // Readiness data
          ...(score !== undefined && { readiness_score: score }),
          ...(activity_balance !== undefined && { activity_balance }),
          ...(body_temperature !== undefined && { body_temperature }),
          ...(hrv_balance !== undefined && { hrv_balance }),
          ...(recovery_index !== undefined && { recovery_index }),
          ...(resting_heart_rate !== undefined && { resting_heart_rate }),
          ...(sleep_balance !== undefined && { sleep_balance }),
          ...(previous_day_activity !== undefined && { previous_day_activity }),
          ...(previous_night !== undefined && { previous_night }),
          ...(temperature_trend_deviation !== undefined && { temperature_trend_deviation })
        };
      });
    } else {
      // Handle object with multiple data types
      return {
        sleep: data.sleep ? simplifyData(data.sleep) : [],
        activity: data.activity ? simplifyData(data.activity) : [],
        readiness: data.readiness ? simplifyData(data.readiness) : []
      };
    }
  }

module.exports = {
  simplifyData
};