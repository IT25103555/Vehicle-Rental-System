package com.ui.ai_recommendation.dto.response;

// Field names match what demand_prediction.py in the Python ai-service returns.
public class DemandPredictionResponse {
    private Integer month;
    private Integer predictedDemand;
    private String note; // present only when the Python service fell back to a raw count

    public Integer getMonth() { return month; }
    public void setMonth(Integer month) { this.month = month; }

    public Integer getPredictedDemand() { return predictedDemand; }
    public void setPredictedDemand(Integer predictedDemand) { this.predictedDemand = predictedDemand; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
}
