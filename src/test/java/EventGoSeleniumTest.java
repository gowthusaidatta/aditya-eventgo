import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;
import java.time.Duration;
import static org.junit.Assert.*;

public class EventGoSeleniumTest {
    private WebDriver driver;
    private WebDriverWait wait;

    @Before
    public void setUp() {
        System.setProperty("webdriver.chrome.driver", "chromedriver-win64/chromedriver.exe");
        driver = new ChromeDriver();
        driver.manage().window().maximize();
        wait = new WebDriverWait(driver, Duration.ofSeconds(10));
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
        // Wait for the input with placeholder 'Email or phone number'
        WebElement emailInput = wait.until(
            ExpectedConditions.presenceOfElementLocated(By.xpath("//input[@placeholder='Email or phone number']"))
        );
        assertNotNull(emailInput);
    }

    @Test
    public void testSignupPageAccessible() {
        driver.get("https://aditya-university.eventgo.tech/signup");
        WebElement signupButton = wait.until(
            ExpectedConditions.presenceOfElementLocated(By.tagName("button"))
        );
        assertNotNull(signupButton);
    }

    @After
    public void tearDown() {
        if (driver != null) {
            driver.quit();
        }
    }
}
