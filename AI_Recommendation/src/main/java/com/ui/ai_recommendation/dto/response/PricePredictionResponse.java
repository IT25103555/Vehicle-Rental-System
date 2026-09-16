package com.ui.ai_recommendation.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;

// Field names match what price_prediction.py in the Python ai-service actually returns.
public class PricePredictionResponse {

    @JsonProperty("vehicleId")
    private String vehicleId;

    @JsonProperty("days")
    private Integer days;

    @JsonProperty("predictedPrice")
    private Double predictedPrice;

    public String getVehicleId() { return vehicleId; }
    public void setVehicleId(String vehicleId) { this.vehicleId = vehicleId; }

    public Integer getDays() { return days; }
    public void setDays(Integer days) { this.days = days; }

    public Double getPredictedPrice() { return predictedPrice; }
    public void setPredictedPrice(Double predictedPrice) { this.predictedPrice = predictedPrice; }
}
