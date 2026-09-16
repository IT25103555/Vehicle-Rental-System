package com.ui.ai_recommendation.dto.request;

public class RecommendationRequest {

    private String customerId;       // Mongo ObjectId as string - optional (works for new/anonymous customers too)
    private String preferredType;    // matches Vehicle.category: Car, Van, SUV, Bike, Lorry, Bus
    private Double maxBudget;

    public String getCustomerId() { return customerId; }
    public void setCustomerId(String customerId) { this.customerId = customerId; }

    public String getPreferredType() { return preferredType; }
    public void setPreferredType(String preferredType) { this.preferredType = preferredType; }

    public Double getMaxBudget() { return maxBudget; }
    public void setMaxBudget(Double maxBudget) { this.maxBudget = maxBudget; }
}
