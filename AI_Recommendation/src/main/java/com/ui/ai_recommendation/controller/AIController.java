package com.ui.ai_recommendation.controller;

import com.ui.ai_recommendation.client.AIServiceClient;
import com.ui.ai_recommendation.dto.request.PricePredictionRequest;
import com.ui.ai_recommendation.dto.request.RecommendationRequest;
import com.ui.ai_recommendation.dto.response.DemandPredictionResponse;
import com.ui.ai_recommendation.dto.response.PricePredictionResponse;
import com.ui.ai_recommendation.dto.response.RecommendationResponse;
import com.ui.ai_recommendation.service.AIRecommendationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/ai")
public class AIController {

    @Autowired
    private AIRecommendationService aiRecommendationService;

    @Autowired
    private AIServiceClient aiServiceClient;

    @PostMapping("/recommend")
    public List<RecommendationResponse> recommendVehicles(@RequestBody RecommendationRequest request) {
        return aiRecommendationService.recommendVehicles(request);
    }

    @PostMapping("/predict/price")
    public PricePredictionResponse predictPrice(@RequestBody PricePredictionRequest request) {
        return aiServiceClient.getPricePrediction(request);
    }

    @GetMapping("/predict/demand")
    public DemandPredictionResponse predictDemand(@RequestParam("month") int month) {
        return aiServiceClient.getDemandPrediction(month);
    }

    @GetMapping("/model-comparison")
    public java.util.Map<String, Object> modelComparison() {
        return aiServiceClient.getModelComparison();
    }
}
