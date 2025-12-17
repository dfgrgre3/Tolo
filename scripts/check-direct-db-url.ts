
import 'dotenv/config';

const url = process.env.DIRECT_DATABASE_URL;
if (url) {
    try {
        const parsed = new URL(url);
        console.log(`Protocol: ${parsed.protocol}`);
        console.log(`Host: ${parsed.host}`);
    } catch (e) {
        console.log('Could not parse DIRECT_DATABASE_URL');
    }
} else {
    console.log('DIRECT_DATABASE_URL is not set');
}
