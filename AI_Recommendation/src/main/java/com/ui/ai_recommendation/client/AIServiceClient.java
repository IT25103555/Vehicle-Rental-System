package com.ui.ai_recommendation.client;

import com.ui.ai_recommendation.dto.request.PricePredictionRequest;
import com.ui.ai_recommendation.dto.response.DemandPredictionResponse;
import com.ui.ai_recommendation.dto.response.PricePredictionResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

// Talks to your teammate's Python FastAPI service (ai-service), which holds the real
// trained price_model.pkl / demand_model.pkl. This is the ONE place that URL is hardcoded -
// if the Python service moves, only application.properties needs to change.
@Component
public class AIServiceClient {

    private final RestTemplate restTemplate;

    @Value("${ai.python-service.base-url}")
    private String pythonServiceBaseUrl;

    public AIServiceClient(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public PricePredictionResponse getPricePrediction(PricePredictionRequest request) {
        String url = UriComponentsBuilder
                .fromUriString(pythonServiceBaseUrl + "/api/predict/price")
                .queryParam("vehicle_id", request.getVehicleId())
                .queryParam("days", request.getRentalDays())
                .toUriString();

        try {
            return restTemplate.getForObject(url, PricePredictionResponse.class);
        } catch (RestClientException e) {
            throw new IllegalStateException(
                    "Could not reach the Python ai-service at " + pythonServiceBaseUrl +
                    " - make sure it's running (uvicorn app.main:app --port 5001). Cause: " + e.getMessage(), e);
        }
    }

    public DemandPredictionResponse getDemandPrediction(int month) {
        String url = UriComponentsBuilder
                .fromUriString(pythonServiceBaseUrl + "/api/predict/demand")
                .queryParam("month", month)
                .toUriString();

        try {
            return restTemplate.getForObject(url, DemandPredictionResponse.class);
        } catch (RestClientException e) {
            throw new IllegalStateException(
                    "Could not reach the Python ai-service at " + pythonServiceBaseUrl +
                    " - make sure it's running (uvicorn app.main:app --port 5001). Cause: " + e.getMessage(), e);
        }
    }

    // Returned as a generic Map rather than a typed DTO because the comparison payload's
    // shape (a list of tasks, each with a list of compared models) is produced directly
    // from train.py's JSON and is easiest to pass through unchanged to the frontend.
    public java.util.Map<String, Object> getModelComparison() {
        String url = pythonServiceBaseUrl + "/api/predict/model-comparison";
        try {
            return restTemplate.getForObject(url, java.util.Map.class);
        } catch (RestClientException e) {
            throw new IllegalStateException(
                    "Could not reach the Python ai-service at " + pythonServiceBaseUrl +
                    " - make sure it's running and that you've run `python train.py` at least once. Cause: " + e.getMessage(), e);
        }
    }
}
