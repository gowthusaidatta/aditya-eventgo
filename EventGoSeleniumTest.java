import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.chrome.ChromeDriver;
import static org.junit.Assert.*;

public class EventGoSeleniumTest {
    private WebDriver driver;

    @Before
    public void setUp() {
        // Set the path to your chromedriver executable
        System.setProperty("webdriver.chrome.driver", "chromedriver.exe");
        driver = new ChromeDriver();
        driver.manage().window().maximize();
    }

    @Test
    public void testHomePageLoads() {
        driver.get("https://aditya-university.eventgo.tech/");
        String title = driver.getTitle();
        assertNotNull(title);
        assertTrue(title.toLowerCase().contains("eventgo"));
    }

    @Test
    public void testLoginPageAccessible() {
        driver.get("https://aditya-university.eventgo.tech/login");
        WebElement emailInput = driver.findElement(By.name("email"));
        assertNotNull(emailInput);
    }

    @Test
    public void testSignupPageAccessible() {
        driver.get("https://aditya-university.eventgo.tech/signup");
        WebElement signupButton = driver.findElement(By.tagName("button"));
        assertNotNull(signupButton);
    }

    // Add more tests for navigation, registration, etc.

    @After
    public void tearDown() {
        if (driver != null) {
            driver.quit();
        }
    }
}
